import { useEffect, useState, type FormEvent } from "react";
import type { CliProfile, CliProfileCapabilities, Workspace } from "../../shared/types";
import type { ModelProviderSummary } from "../../shared/model-provider";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { PriorityModelRoute, ResolvedRoute } from "../../shared/model-route";
import { useClientRuntime } from "../runtime/client-runtime";
import { CHAT_ENABLED } from "../feature-flags";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";
import { Select } from "./ui/Select";
import { Button, EmptyState, TextField } from "./ui";
import { DialogActions } from "./patterns";

interface NewSessionDialogProps {
  profiles: CliProfile[];
  readonly: boolean;
  workspaces: Workspace[];
  onClose: () => void;
  onCreate: (input: { name: string; workspaceId: string; profileId: string; interactionMode: "chat" | "terminal"; modelRouteId?: string; providerId?: string }) => Promise<void>;
  onOpenSettings: () => void;
  /** 新建入口默认 terminal（终端模式）；用户可手动改选 chat */
  defaultMode?: "chat" | "terminal";
  /** capability 加载入口（默认 api.profileCapabilities；测试可注入，frontend-spec §6） */
  loadCapabilities?: (profileId: string, signal?: AbortSignal) => Promise<CliProfileCapabilities>;
}

export function NewSessionDialog({ profiles, readonly, workspaces, onClose, onCreate, onOpenSettings, defaultMode = "terminal", loadCapabilities }: NewSessionDialogProps) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const capabilityLoader = loadCapabilities ?? runtime.engines.profileCapabilities;
  const [form, setForm] = useState({ name: "", workspaceId: workspaces[0]?.id ?? "", profileId: profiles[0]?.id ?? "", providerId: "" });
  const [mode, setMode] = useState<"chat" | "terminal">(CHAT_ENABLED ? defaultMode : "terminal");
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  const [routes, setRoutes] = useState<PriorityModelRoute[]>([]);
  const [deployments, setDeployments] = useState<ModelDeploymentSummary[]>([]);
  const [providers, setProviders] = useState<ModelProviderSummary[]>([]);
  const [routeId, setRouteId] = useState("");
  const [routePreview, setRoutePreview] = useState<ResolvedRoute>();
  const [routeLoading, setRouteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ready = workspaces.length > 0 && profiles.length > 0;
  // chat 功能开关关闭 → 全局锁定 terminal（console-gaps SPEC §1）；否则按 capability 锁定：
  // 所选 Profile 不支持 headless → 模式锁定 terminal 并展示降级说明；加载失败保持可选，以服务端结果为准（frontend-spec §6）
  const chatLocked = !CHAT_ENABLED || capabilities?.supportsHeadlessTurns === false || (capabilities !== undefined && capabilities.compatibility !== "supported");
  const effectiveMode = chatLocked ? "terminal" : mode;

  useEffect(() => {
    if (!form.profileId) { setCapabilities(undefined); return; }
    const controller = new AbortController();
    setCapabilities(undefined);
    capabilityLoader(form.profileId, controller.signal).then((next) => { if (!controller.signal.aborted) setCapabilities(next); }).catch(() => undefined);
    return () => controller.abort();
  }, [capabilityLoader, form.profileId]);

  useEffect(() => {
    let active = true;
    void runtime.routing.providers().then((response) => {
      if (active) setProviders(response.providers);
    }).catch(() => {
      if (active) setProviders([]);
    });
    return () => { active = false; };
  }, [runtime.routing]);

  const selectedProfile = profiles.find((profile) => profile.id === form.profileId);
  const providerOptions = providers
    .filter((provider) => provider.enabled && provider.configured && selectedProfile && providerMatchesProfile(provider, selectedProfile.adapterId))
    .map((provider) => ({ value: provider.id, label: provider.name }));

  useEffect(() => {
    if (form.providerId && !providerOptions.some((option) => option.value === form.providerId)) setForm((current) => ({ ...current, providerId: "" }));
  }, [form.providerId, providerOptions]);

  useEffect(() => {
    if (effectiveMode !== "chat") {
      setRoutePreview(undefined);
      setRouteLoading(false);
      return;
    }
    let active = true;
    setRouteLoading(true);
    void Promise.all([runtime.routing.modelRoutes(), runtime.routing.modelDeployments()]).then(([routeResponse, deploymentResponse]) => {
      if (!active) return;
      setRoutes(routeResponse.routes);
      setDeployments(deploymentResponse.deployments);
    }).catch(() => undefined).finally(() => { if (active) setRouteLoading(false); });
    return () => { active = false; };
  }, [effectiveMode, runtime.routing]);

  useEffect(() => {
    if (effectiveMode !== "chat" || !form.workspaceId || !form.profileId) return;
    let active = true;
    setRouteLoading(true);
    void runtime.routing.previewModelRoute({ workspaceId: form.workspaceId, profileId: form.profileId, ...(routeId ? { routeId } : {}) }).then((response) => {
      if (active) setRoutePreview(response.resolvedRoute);
    }).catch(() => {
      if (active) setRoutePreview(undefined);
    }).finally(() => { if (active) setRouteLoading(false); });
    return () => { active = false; };
  }, [effectiveMode, form.profileId, form.workspaceId, routeId, runtime.routing]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.workspaceId || !form.profileId || (effectiveMode === "chat" && (routeLoading || routePreview?.canSend === false || !routePreview))) return;
    // 名称可选：留空时用「工作区名 + 时间」自动生成，免去每次手动输入
    const workspaceName = workspaces.find((item) => item.id === form.workspaceId)?.name;
    const name = form.name.trim() || generateSessionName(workspaceName || t("newCliSession"));
    setSubmitting(true);
    try { await onCreate({ name, workspaceId: form.workspaceId, profileId: form.profileId, interactionMode: effectiveMode, ...(form.providerId ? { providerId: form.providerId } : {}), ...(routeId ? { modelRouteId: routeId } : {}) }); } finally { setSubmitting(false); }
  }

  return <Overlay title={t("newCliSession")} description={t("newSessionDescription")} onClose={onClose}>
    {!ready ? <EmptyState className="setup-required" icon={<div className="empty-icon"><Icon name="settings" /></div>} title={t("setupFirst")} description={t("setupFirstDescription")} actions={<Button variant="primary" className="primary-button" onClick={onOpenSettings}><Icon name="settings" />{t("openSettings")}</Button>} /> : <form className="dialog-form" onSubmit={submit}>
      <TextField autoFocus label={t("sessionName")} placeholder={t("sessionNameOptionalPlaceholder")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <div className="field-grid">
        <label><span>{t("workspace")}</span><Select ariaLabel={t("workspace")} value={form.workspaceId} options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))} onChange={(workspaceId) => setForm({ ...form, workspaceId })} /></label>
        <label><span>{t("cliProfile")}</span><Select ariaLabel={t("cliProfile")} value={form.profileId} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} onChange={(profileId) => setForm({ ...form, profileId })} /></label>
      </div>
      <label className="session-provider-field"><span>{t("routingProviderSelection")}</span><Select ariaLabel={t("routingProviderSelection")} value={form.providerId || "inherit"} options={[{ value: "inherit", label: t("routingProviderInherit") }, ...providerOptions]} onChange={(providerId) => setForm({ ...form, providerId: providerId === "inherit" ? "" : providerId })} /></label>
      {!providerOptions.length && <small className="interaction-mode-locked">{t("routingProviderUnavailable")}</small>}
      <label className="interaction-mode-field"><span>{t("interactionModeLabel")}</span><Select ariaLabel={t("interactionModeLabel")} value={effectiveMode} disabled={chatLocked} options={[{ value: "chat", label: t("interactionModeChat") }, { value: "terminal", label: t("interactionModeTerminal") }]} onChange={(next) => setMode(next as "chat" | "terminal")} /></label>
      {chatLocked && <small className="interaction-mode-locked">{CHAT_ENABLED ? t("interactionModeLocked") : t("chatComingSoonHint")}</small>}
      {effectiveMode === "chat" && <RoutePreview routes={routes} deployments={deployments} routeId={routeId} preview={routePreview} loading={routeLoading} onChange={setRouteId} />}
      <LaunchPreview workspace={workspaces.find((item) => item.id === form.workspaceId)} profile={profiles.find((item) => item.id === form.profileId)} />
      <DialogActions><Button variant="secondary" className="secondary-button" onClick={onClose}>{t("cancel")}</Button><Button type="submit" variant="primary" className="primary-button" disabled={readonly || (effectiveMode === "chat" && (routeLoading || !routePreview?.canSend))} loading={submitting} loadingLabel={t("starting")}>{t("confirmAndStart")}</Button></DialogActions>
    </form>}
  </Overlay>;
}

/** 自动会话名：「前缀 MM-DD HH:mm」，保证非空且可区分 */
function generateSessionName(prefix: string) {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${prefix} ${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function providerMatchesProfile(provider: ModelProviderSummary, adapterId: CliProfile["adapterId"]) {
  if (provider.protocol === "openai-compatible") return adapterId === "codex";
  return adapterId === "claude-code" || adapterId === "kimi" || adapterId === "glm";
}

function LaunchPreview({ workspace, profile }: { workspace?: Workspace; profile?: CliProfile }) {
  const { t } = useI18n();
  const command = profile ? [profile.command, ...profile.args].map((part) => JSON.stringify(part)).join(" ") : "—";
  return <div className="launch-preview"><span>{t("launchPreview")}</span><code>{command}</code><small>{workspace?.path ?? t("selectWorkspace")}</small></div>;
}

function RoutePreview({ routes, deployments, routeId, preview, loading, onChange }: { routes: PriorityModelRoute[]; deployments: ModelDeploymentSummary[]; routeId: string; preview?: ResolvedRoute; loading: boolean; onChange: (routeId: string) => void }) {
  const { t } = useI18n();
  const preferred = deployments.find((deployment) => deployment.id === preview?.selectedDeploymentId);
  const source = [...(preview?.sourceTrace ?? [])].reverse().find((entry) => entry.field === "routeId")?.source;
  return <section className="new-session-route" data-route-source={source ?? "project"} aria-label={t("routeControlLabel")}>
    <label><span>{t("routeControlLabel")}</span><Select ariaLabel={t("routeControlLabel")} value={routeId || "inherit"} options={[{ value: "inherit", label: t("routeInherit") }, ...routes.filter((route) => route.enabled && !route.archivedAt).map((route) => ({ value: route.id, label: route.name }))]} onChange={(value) => onChange(value === "inherit" ? "" : value)} /></label>
    <div className="new-session-route-summary" aria-live="polite">
      <span>{source ? t(`routeSource${source.slice(0, 1).toUpperCase()}${source.slice(1)}` as "routeSourceProject") : t("routeLoading")}</span>
      {loading ? <small>{t("routeResolving")}</small> : preferred ? <small>{t("routePreferred", { name: preferred.name, model: preferred.modelId })}</small> : preview?.canSend === false ? <small>{t("routeUnavailable")}</small> : <small>{t("routeLegacy")}</small>}
    </div>
  </section>;
}
