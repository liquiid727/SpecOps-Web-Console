use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Runtime};
use tauri_plugin_shell::{
    process::{Command, CommandChild, CommandEvent},
    ShellExt,
};

const LOOPBACK_HOST: &str = "127.0.0.1";
const MAX_RESTARTS: u8 = 3;
const HEALTH_TIMEOUT: Duration = Duration::from_secs(3);
const HEALTH_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SupervisorPhase {
    Starting,
    Spawning,
    HealthChecking,
    Ready,
    Restarting,
    RecoveryRequired,
    Failed,
    Stopping,
    Stopped,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StartupFailureAction {
    Restart,
    Fail,
}

#[derive(Debug)]
struct SupervisorPolicy {
    phase: SupervisorPhase,
    child_running: bool,
    restart_count: u8,
}

impl SupervisorPolicy {
    fn new() -> Self {
        Self {
            phase: SupervisorPhase::Starting,
            child_running: false,
            restart_count: 0,
        }
    }

    fn begin_spawn(&mut self) -> Result<(), &'static str> {
        if self.child_running {
            return Err("sidecar is already running");
        }
        if matches!(
            self.phase,
            SupervisorPhase::Ready
                | SupervisorPhase::RecoveryRequired
                | SupervisorPhase::Failed
                | SupervisorPhase::Stopping
                | SupervisorPhase::Stopped
        ) {
            return Err("sidecar cannot be spawned in the current phase");
        }
        self.phase = SupervisorPhase::Spawning;
        self.child_running = true;
        Ok(())
    }

    fn begin_health_check(&mut self) {
        self.phase = SupervisorPhase::HealthChecking;
    }

    fn mark_ready(&mut self) {
        self.phase = SupervisorPhase::Ready;
    }

    fn startup_failed(&mut self) -> StartupFailureAction {
        self.child_running = false;
        if self.restart_count < MAX_RESTARTS {
            self.restart_count += 1;
            self.phase = SupervisorPhase::Restarting;
            StartupFailureAction::Restart
        } else {
            self.phase = SupervisorPhase::Failed;
            StartupFailureAction::Fail
        }
    }

    fn child_exited(&mut self) {
        self.child_running = false;
        self.phase = if matches!(
            self.phase,
            SupervisorPhase::Stopping | SupervisorPhase::Stopped
        ) {
            SupervisorPhase::Stopped
        } else {
            // Never auto-restart a runtime that completed its health handshake.
            SupervisorPhase::RecoveryRequired
        };
    }

    fn begin_shutdown(&mut self) {
        self.phase = SupervisorPhase::Stopping;
    }

    fn mark_stopped(&mut self) {
        self.child_running = false;
        self.phase = SupervisorPhase::Stopped;
    }
}

struct HostState {
    policy: SupervisorPolicy,
    child: Option<CommandChild>,
}

#[derive(Clone)]
pub struct DesktopHost {
    port: u16,
    credential: Arc<str>,
    allowed_origins: Arc<[String]>,
    state: Arc<Mutex<HostState>>,
}

impl DesktopHost {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            port: reserve_loopback_port()?,
            credential: Arc::from(generate_credential()?),
            allowed_origins: Arc::from(configured_origins()),
            state: Arc::new(Mutex::new(HostState {
                policy: SupervisorPolicy::new(),
                child: None,
            })),
        })
    }

    pub fn start<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        loop {
            {
                let mut state = self
                    .state
                    .lock()
                    .map_err(|_| "desktop host state is poisoned")?;
                state.policy.begin_spawn().map_err(str::to_owned)?;
            }

            let command = runtime_command(app, self)?;
            let (receiver, child) = match command.spawn() {
                Ok(spawned) => spawned,
                Err(error) => {
                    if self.startup_failed()? == StartupFailureAction::Restart {
                        continue;
                    }
                    return Err(format!("runtime sidecar failed to spawn: {error}"));
                }
            };

            {
                let mut state = self
                    .state
                    .lock()
                    .map_err(|_| "desktop host state is poisoned")?;
                state.policy.begin_health_check();
            }

            if wait_for_health(self.port, &self.credential, HEALTH_TIMEOUT) {
                {
                    let mut state = self
                        .state
                        .lock()
                        .map_err(|_| "desktop host state is poisoned")?;
                    state.policy.mark_ready();
                    state.child = Some(child);
                }
                self.monitor_exit(receiver);
                return Ok(());
            }

            let _ = child.kill();
            if self.startup_failed()? == StartupFailureAction::Fail {
                return Err(format!(
                    "runtime sidecar did not become healthy after {} restarts",
                    MAX_RESTARTS
                ));
            }
        }
    }

    pub fn bootstrap_script(&self) -> String {
        let base_url = format!("http://{LOOPBACK_HOST}:{}", self.port);
        format!(
            "Object.defineProperty(window, '__SPECOS_DESKTOP_RUNTIME__', {{ value: Object.freeze({{ baseUrl: '{base_url}', credential: '{}' }}), enumerable: false, configurable: false, writable: false }});",
            self.credential
        )
    }

    pub fn shutdown(&self) {
        let child = self.state.lock().ok().and_then(|mut state| {
            state.policy.begin_shutdown();
            let child = state.child.take();
            if child.is_none() {
                state.policy.mark_stopped();
            }
            child
        });
        if let Some(child) = child {
            let _ = child.kill();
        }
    }

    fn startup_failed(&self) -> Result<StartupFailureAction, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "desktop host state is poisoned")?;
        Ok(state.policy.startup_failed())
    }

    fn monitor_exit(&self, mut receiver: tauri::async_runtime::Receiver<CommandEvent>) {
        let host = self.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = receiver.recv().await {
                if matches!(event, CommandEvent::Terminated(_)) {
                    if let Ok(mut state) = host.state.lock() {
                        state.child.take();
                        state.policy.child_exited();
                    }
                    break;
                }
            }
        });
    }
}

fn runtime_command<R: Runtime>(app: &AppHandle<R>, host: &DesktopHost) -> Result<Command, String> {
    #[cfg(debug_assertions)]
    let command = app
        .shell()
        .command("node")
        .arg("dist-server/server/index.js")
        .current_dir(
            std::env::current_dir()
                .map_err(|error| format!("failed to resolve sidecar cwd: {error}"))?,
        );

    #[cfg(not(debug_assertions))]
    let command = app
        .shell()
        .sidecar("product-ai-os-runtime")
        .map_err(|error| format!("failed to resolve packaged runtime sidecar: {error}"))?;

    Ok(command
        .env("PORT", host.port.to_string())
        .env("SPECOS_API_PORT", host.port.to_string())
        .env("SPECOS_DESKTOP_BEARER", host.credential.as_ref())
        .env("SPECOS_CSRF_CAPABILITY", host.credential.as_ref())
        .env("SPECOS_ALLOWED_ORIGINS", host.allowed_origins.join(",")))
}

fn reserve_loopback_port() -> Result<u16, String> {
    let listener = TcpListener::bind((LOOPBACK_HOST, 0))
        .map_err(|error| format!("failed to reserve loopback sidecar port: {error}"))?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| format!("failed to read loopback sidecar port: {error}"))
}

fn generate_credential() -> Result<String, String> {
    let mut bytes = [0_u8; 32];
    fill_random(&mut bytes)?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

#[cfg(unix)]
fn fill_random(bytes: &mut [u8]) -> Result<(), String> {
    std::fs::File::open("/dev/urandom")
        .and_then(|mut source| source.read_exact(bytes))
        .map_err(|error| format!("failed to generate desktop credential: {error}"))
}

#[cfg(windows)]
fn fill_random(bytes: &mut [u8]) -> Result<(), String> {
    use std::ffi::c_void;

    #[link(name = "bcrypt")]
    extern "system" {
        fn BCryptGenRandom(algorithm: *mut c_void, buffer: *mut u8, length: u32, flags: u32)
            -> i32;
    }

    const BCRYPT_USE_SYSTEM_PREFERRED_RNG: u32 = 0x0000_0002;
    let status = unsafe {
        BCryptGenRandom(
            std::ptr::null_mut(),
            bytes.as_mut_ptr(),
            bytes.len() as u32,
            BCRYPT_USE_SYSTEM_PREFERRED_RNG,
        )
    };
    if status >= 0 {
        Ok(())
    } else {
        Err(format!(
            "failed to generate desktop credential: NTSTATUS {status:#x}"
        ))
    }
}

fn configured_origins() -> Vec<String> {
    let gui_port = std::env::var("SPECOS_GUI_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(3000);
    vec![
        "tauri://localhost".to_owned(),
        "http://tauri.localhost".to_owned(),
        "https://tauri.localhost".to_owned(),
        format!("http://127.0.0.1:{gui_port}"),
        format!("http://localhost:{gui_port}"),
    ]
}

fn wait_for_health(port: u16, credential: &str, timeout: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() <= timeout {
        if probe_health(port, credential) {
            return true;
        }
        thread::sleep(HEALTH_INTERVAL);
    }
    false
}

fn probe_health(port: u16, credential: &str) -> bool {
    let address = format!("{LOOPBACK_HOST}:{port}");
    let Ok(socket_address) = address.parse() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&socket_address, HEALTH_INTERVAL) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(HEALTH_INTERVAL));
    let request = format!(
        "GET /health HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {credential}\r\nConnection: close\r\n\r\n"
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }
    response.starts_with("HTTP/1.1 200") && response.contains("\"status\":\"ok\"")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prevents_duplicate_sidecars() {
        let mut policy = SupervisorPolicy::new();
        policy.begin_spawn().unwrap();
        assert_eq!(policy.begin_spawn(), Err("sidecar is already running"));
    }

    #[test]
    fn bounds_startup_restarts() {
        let mut policy = SupervisorPolicy::new();
        for expected_restart in 1..=MAX_RESTARTS {
            policy.begin_spawn().unwrap();
            policy.begin_health_check();
            assert_eq!(policy.startup_failed(), StartupFailureAction::Restart);
            assert_eq!(policy.restart_count, expected_restart);
        }
        policy.begin_spawn().unwrap();
        assert_eq!(policy.startup_failed(), StartupFailureAction::Fail);
        assert_eq!(policy.phase, SupervisorPhase::Failed);
    }

    #[test]
    fn ready_runtime_exit_requires_recovery() {
        let mut policy = SupervisorPolicy::new();
        policy.begin_spawn().unwrap();
        policy.begin_health_check();
        policy.mark_ready();
        policy.child_exited();
        assert_eq!(policy.phase, SupervisorPhase::RecoveryRequired);
        assert!(!policy.child_running);
        assert!(policy.begin_spawn().is_err());
    }

    #[test]
    fn shutdown_reaches_stopped_without_restart() {
        let mut policy = SupervisorPolicy::new();
        policy.begin_spawn().unwrap();
        policy.begin_health_check();
        policy.mark_ready();
        policy.begin_shutdown();
        policy.child_exited();
        assert_eq!(policy.phase, SupervisorPhase::Stopped);
    }

    #[test]
    fn launch_credentials_are_ephemeral_and_unpredictable() {
        let first = generate_credential().unwrap();
        let second = generate_credential().unwrap();
        assert_eq!(first.len(), 64);
        assert_eq!(second.len(), 64);
        assert_ne!(first, second);
    }
}
