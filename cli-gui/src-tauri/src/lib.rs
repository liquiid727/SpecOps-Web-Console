mod desktop_host;

use desktop_host::DesktopHost;
use tauri::Manager;

/// Report the desktop shell version so the frontend can confirm the native bridge.
#[tauri::command]
fn platform_info(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

/// Application entrypoint shared by the desktop binary and future mobile targets.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let desktop_host = DesktopHost::new().expect("failed to initialize desktop runtime host");
    let bootstrap_script = desktop_host.bootstrap_script();
    let setup_host = desktop_host.clone();
    let app = tauri::Builder::default()
        .append_invoke_initialization_script(bootstrap_script)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(desktop_host)
        .setup(move |app| {
            setup_host.start(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![platform_info])
        .build(tauri::generate_context!())
        .expect("error while building Product AI OS CLI GUI desktop shell");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
        ) {
            app_handle.state::<DesktopHost>().shutdown();
        }
    });
}
