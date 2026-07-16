import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppState, Session, StateResponse } from "../shared/types";
import { api, mergeState } from "./api";
import { TerminalView } from "./terminal";
import "./styles.css";

const emptyState: AppState = { workspaces: [], profiles: [], sessions: [] };

function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [readonly, setReadonly] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [workspaceForm, setWorkspaceForm] = useState({ name: "", path: "" });
  const [sessionForm, setSessionForm] = useState({ name: "", workspaceId: "", profileId: "" });
  const [profileForm, setProfileForm] = useState({ name: "", command: "", args: "" });

  const refresh = useCallback(async () => {
    try {
      const next = await api.state();
      setState((previous) => mergeState(previous, next));
      setReadonly(next.readonly);
      setActiveSessionId((current) => current && next.sessions.some((session) => session.id === current) ? current : next.sessions[0]?.id);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTerminalStatus = useCallback(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const activeSession = state.sessions.find((session) => session.id === activeSessionId);
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((profile) => profile.id === activeSession?.profileId);

  async function submitWorkspace(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createWorkspace(workspaceForm);
      setWorkspaceForm({ name: "", path: "" });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "failed to create workspace");
    }
  }

  async function submitSession(event: FormEvent) {
    event.preventDefault();
    if (!sessionForm.workspaceId || !sessionForm.profileId) return setError("select a workspace and CLI profile");
    const selectedWorkspace = state.workspaces.find((workspace) => workspace.id === sessionForm.workspaceId);
    const selectedProfile = state.profiles.find((profile) => profile.id === sessionForm.profileId);
    if (!selectedWorkspace || !selectedProfile) return setError("select a valid workspace and CLI profile");
    const preview = [selectedProfile.command, ...selectedProfile.args].map((part) => JSON.stringify(part)).join(" ");
    if (!window.confirm(`Start ${selectedProfile.name}?\n\nCommand: ${preview}\nDirectory: ${selectedWorkspace.path}`)) return;
    try {
      const session = await api.createSession({ ...sessionForm, confirmed: true });
      setActiveSessionId(session.id);
      setSessionForm({ name: "", workspaceId: sessionForm.workspaceId, profileId: sessionForm.profileId });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "failed to create session");
      await refresh();
    }
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createProfile({ name: profileForm.name, command: profileForm.command, args: profileForm.args.split(" ").filter(Boolean) });
      setProfileForm({ name: "", command: "", args: "" });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "failed to create profile");
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "operation failed");
    }
  }

  const groupedSessions = useMemo(() => state.workspaces.map((workspace) => ({
    workspace,
    sessions: state.sessions.filter((session) => session.workspaceId === workspace.id)
  })), [state]);

  if (loading) return <main className="center-state">Loading workspace…</main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><div><strong>Product AI OS</strong><small>CLI workspace launcher</small></div></div>
        <section className="side-section">
          <div className="section-heading"><span>Workspaces</span><span className="count">{state.workspaces.length}</span></div>
          {state.workspaces.length === 0 && <p className="muted">Register a project directory to begin.</p>}
          {groupedSessions.map(({ workspace, sessions }) => (
            <div className="workspace-group" key={workspace.id}>
              <div className="workspace-title"><span className="folder">⌂</span><span title={workspace.path}>{workspace.name}</span><button onClick={() => runAction(() => api.deleteWorkspace(workspace.id))} disabled={sessions.length > 0 || readonly} aria-label={`Delete ${workspace.name}`}>×</button></div>
              <small className="path-label">{workspace.path}</small>
              {sessions.map((session) => <SessionRow key={session.id} session={session} active={session.id === activeSessionId} onSelect={() => setActiveSessionId(session.id)} />)}
            </div>
          ))}
        </section>
        <section className="side-section profiles-section">
          <div className="section-heading"><span>CLI Profiles</span><span className="count">{state.profiles.length}</span></div>
          {state.profiles.map((profile) => <div className="profile-row" key={profile.id}><span className="profile-dot" /><span className="profile-name">{profile.name}</span><code>{profile.command}</code><button className="inline-delete" onClick={() => runAction(() => api.deleteProfile(profile.id))} disabled={readonly || state.sessions.some((session) => session.profileId === profile.id)} aria-label={`Delete ${profile.name}`}>×</button></div>)}
        </section>
      </aside>

      <section className="main-area">
        <header className="topbar"><div><span className="eyebrow">LOCAL WORKSPACE</span><h1>{activeSession?.name ?? "Start a new CLI session"}</h1></div><div className="topbar-status"><span className={`status-dot ${activeSession?.status ?? "stopped"}`} />{readonly ? "Read-only" : "Local"}<span className="host-label">127.0.0.1</span></div></header>
        {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError(undefined)}>Dismiss</button></div>}
        <div className="content-grid">
          <section className="terminal-panel">
            <div className="panel-header"><div><span className="eyebrow">TERMINAL</span><strong>{activeSession ? `${activeProfile?.name ?? "CLI"} · ${activeWorkspace?.name ?? "Unknown workspace"}` : "No active session"}</strong></div>{activeSession && <div className="panel-actions"><span className={`pill ${activeSession.status}`}>{activeSession.status}</span>{activeSession.status === "running" ? <button className="ghost-button" onClick={() => runAction(() => api.stopSession(activeSession.id))}>Stop</button> : <button className="primary-button small" onClick={() => { if (window.confirm(`Resume ${activeSession.name}?`)) void runAction(() => api.startSession(activeSession.id)); }} disabled={readonly}>Resume</button>}</div>}</div>
            {activeSession?.status === "running" ? <TerminalView sessionId={activeSession.id} onStatus={handleTerminalStatus} /> : <EmptyTerminal activeSession={activeSession} />}
          </section>
          <aside className="control-panel">
            <section className="form-card"><div className="card-title">New workspace</div><p className="muted">Add a local project directory once, then reuse it for every session.</p><form onSubmit={submitWorkspace}><input required placeholder="Name · Payment Platform" value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} /><input required placeholder="Path · /Users/me/project" value={workspaceForm.path} onChange={(event) => setWorkspaceForm({ ...workspaceForm, path: event.target.value })} /><button className="primary-button" disabled={readonly}>Add workspace</button></form></section>
            <section className="form-card"><div className="card-title">New session</div><p className="muted">Name each task so concurrent CLI work stays easy to identify.</p><form onSubmit={submitSession}><input required placeholder="Session name · Backend API" value={sessionForm.name} onChange={(event) => setSessionForm({ ...sessionForm, name: event.target.value })} /><select required value={sessionForm.workspaceId} onChange={(event) => setSessionForm({ ...sessionForm, workspaceId: event.target.value })}><option value="">Select workspace</option>{state.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><select required value={sessionForm.profileId} onChange={(event) => setSessionForm({ ...sessionForm, profileId: event.target.value })}><option value="">Select CLI</option>{state.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><button className="primary-button" disabled={readonly || !state.workspaces.length}>Confirm and start</button></form></section>
            <section className="form-card"><div className="card-title">New CLI profile</div><p className="muted">Store an executable and argument list for repeatable local launches.</p><form onSubmit={submitProfile}><input required placeholder="Name · Review Claude" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /><input required placeholder="Command · claude" value={profileForm.command} onChange={(event) => setProfileForm({ ...profileForm, command: event.target.value })} /><input placeholder="Args · --model opus" value={profileForm.args} onChange={(event) => setProfileForm({ ...profileForm, args: event.target.value })} /><button className="primary-button" disabled={readonly}>Save profile</button></form></section>
            {activeSession && <section className="form-card details-card"><div className="card-title">Session details</div><Detail label="Name" value={activeSession.name} /><Detail label="CLI" value={activeProfile?.command ?? "—"} mono /><Detail label="Directory" value={activeWorkspace?.path ?? "—"} mono /><button className="ghost-button full-button" onClick={() => { const name = window.prompt("Rename session", activeSession.name)?.trim(); if (name && name !== activeSession.name) void runAction(() => api.renameSession(activeSession.id, name)); }}>Rename session</button><button className="danger-button" onClick={() => { if (window.confirm("Delete this session?")) void runAction(() => api.deleteSession(activeSession.id)); }} disabled={readonly}>Delete session</button></section>}
          </aside>
        </div>
      </section>
    </main>
  );
}

function SessionRow({ session, active, onSelect }: { session: Session; active: boolean; onSelect: () => void }) {
  return <button className={`session-row ${active ? "active" : ""}`} onClick={onSelect}><span className={`status-dot ${session.status}`} /><span className="session-copy"><strong>{session.name}</strong><small>{session.status}</small></span><span className="session-arrow">›</span></button>;
}

function EmptyTerminal({ activeSession }: { activeSession?: Session }) {
  return <div className="empty-terminal"><div className="terminal-symbol">⌁</div><strong>{activeSession ? `Session is ${activeSession.status}` : "Your terminal workspace"}</strong><p>{activeSession ? "Resume the session to open a fresh PTY." : "Create a session to open an interactive Codex or Claude terminal."}</p></div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
