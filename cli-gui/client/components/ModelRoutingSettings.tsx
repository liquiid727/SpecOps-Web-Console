import { useEffect, useRef, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ModelProviderSummary } from "../../shared/model-provider";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { PriorityModelRoute } from "../../shared/model-route";
import type { CliProfileV2 } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useClientRuntime } from "../runtime/client-runtime";
import { ActionDialog } from "./ActionDialog";
import { Badge, Button, EmptyState, Icon, IconButton, Select, Tabs, TextField, useFeedback } from "./ui";

type RoutingView = "providers" | "deployments" | "routes";

export function ModelRoutingSettings() {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const feedback = useFeedback();
  const [view, setView] = useState<RoutingView>("providers");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [readonly, setReadonly] = useState(false);
  const [providers, setProviders] = useState<ModelProviderSummary[]>([]);
  const [deployments, setDeployments] = useState<ModelDeploymentSummary[]>([]);
  const [routes, setRoutes] = useState<PriorityModelRoute[]>([]);
  const [profiles, setProfiles] = useState<CliProfileV2[]>([]);

  const refresh = async () => {
    try {
      const [state, providerResponse, deploymentResponse, routeResponse] = await Promise.all([
        runtime.sessions.state(),
        runtime.routing.providers(),
        runtime.routing.modelDeployments(),
        runtime.routing.modelRoutes()
      ]);
      setReadonly(state.readonly);
      setProfiles(state.profiles);
      setProviders(providerResponse.providers);
      setDeployments(deploymentResponse.deployments);
      setRoutes(routeResponse.routes);
      setStatus("ready");
    } catch (cause) {
      setStatus("error");
      feedback.error(toFeedbackError(cause, t, "routingLoadFailed", "model-routing:load"));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (status === "loading") return <p className="settings-description routing-loading">{t("routingLoading")}</p>;
  if (status === "error") return <div className="routing-error" role="alert"><p className="settings-description">{t("routingLoadFailed")}</p><Button variant="secondary" onClick={() => { setStatus("loading"); void refresh(); }}><Icon name="refresh" />{t("retry")}</Button></div>;

  return (
    <section className="model-routing-settings" aria-labelledby="model-routing-title">
      <header className="routing-header">
        <div><h3 id="model-routing-title">{t("routingTitle")}</h3><p className="settings-description">{t("routingDescription")}</p></div>
        {readonly && <Badge>{t("routingReadonly")}</Badge>}
      </header>
      <Tabs
        ariaLabel={t("routingTitle")}
        value={view}
        onChange={setView}
        className="routing-tabs"
        items={[
          { id: "providers", label: t("routingProviders") },
          { id: "deployments", label: t("routingDeployments") },
          { id: "routes", label: t("routingRoutes") }
        ]}
      />
      {view === "providers" && <ProviderConnectionsSettings providers={providers} readonly={readonly} onRefresh={refresh} />}
      {view === "deployments" && <ModelDeploymentsSettings providers={providers} profiles={profiles} deployments={deployments} readonly={readonly} onRefresh={refresh} />}
      {view === "routes" && <ModelRoutesSettings routes={routes} deployments={deployments} readonly={readonly} onRefresh={refresh} />}
    </section>
  );
}

function ProviderConnectionsSettings({ providers, readonly, onRefresh }: { providers: ModelProviderSummary[]; readonly: boolean; onRefresh: () => Promise<void> }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const feedback = useFeedback();
  const [draft, setDraft] = useState({ id: "", name: "", protocol: "openai-compatible", baseUrl: "", credentialRef: "", models: "" });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerEdit, setProviderEdit] = useState<{ name: string; protocol: string; baseUrl: string; models: string }>();
  const [deleteProviderId, setDeleteProviderId] = useState<string>();

  const create = async () => {
    if (!draft.id.trim() || !draft.name.trim() || !draft.baseUrl.trim()) return;
    setPending("create");
    try {
      await runtime.routing.createProvider({ id: draft.id.trim(), name: draft.name.trim(), protocol: draft.protocol, baseUrl: draft.baseUrl.trim(), ...(draft.credentialRef.trim() ? { credentialRef: draft.credentialRef.trim() } : {}), models: parseModels(draft.models) });
      setDraft({ id: "", name: "", protocol: "openai-compatible", baseUrl: "", credentialRef: "", models: "" });
      feedback.success({ title: t("routingSaved") });
      await onRefresh();
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", "model-routing:provider-create")); }
    finally { setPending(null); }
  };

  const beginEdit = (provider: ModelProviderSummary) => {
    setEditingProviderId(provider.id);
    setProviderEdit({ name: provider.name, protocol: provider.protocol, baseUrl: provider.baseUrl, models: provider.models.join(", ") });
  };

  const saveEdit = async (providerId: string) => {
    if (!providerEdit?.name.trim() || !providerEdit.baseUrl.trim()) return;
    setPending(providerId);
    try {
      await runtime.routing.updateProvider(providerId, { name: providerEdit.name.trim(), protocol: providerEdit.protocol, baseUrl: providerEdit.baseUrl.trim(), models: parseModels(providerEdit.models) });
      await onRefresh();
      setEditingProviderId(null);
      setProviderEdit(undefined);
      feedback.success({ title: t("routingSaved") });
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:provider-update:${providerId}`)); }
    finally { setPending(null); }
  };

  const toggleProvider = async (provider: ModelProviderSummary) => {
    setPending(provider.id);
    try { await runtime.routing.updateProvider(provider.id, { enabled: !provider.enabled }); await onRefresh(); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:provider-enabled:${provider.id}`)); }
    finally { setPending(null); }
  };

  const setCredential = async (providerId: string) => {
    const secret = credentials[providerId]?.trim();
    if (!secret) return;
    setPending(providerId);
    try {
      await runtime.routing.setProviderCredential(providerId, secret);
      setCredentials((current) => ({ ...current, [providerId]: "" }));
      feedback.success({ title: t("routingCredentialConfigured") });
      await onRefresh();
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:credential:${providerId}`)); }
    finally { setPending(null); }
  };

  const remove = async (providerId: string) => {
    setPending(providerId);
    try { await runtime.routing.deleteProvider(providerId); await onRefresh(); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:provider-delete:${providerId}`)); throw cause; }
    finally { setPending(null); }
  };

  return (
    <div className="routing-view" data-model-routing-view="providers">
      {!providers.length && <EmptyState icon="bot" title={t("routingEmpty")} description={t("routingNoProviders")} />}
      <div className="routing-resource-list">
        {providers.map((provider) => (
          <article className="routing-resource-row" key={provider.id} data-provider-id={provider.id}>
            {editingProviderId === provider.id && providerEdit ? <div className="routing-provider-edit-form">
              <TextField value={providerEdit.name} aria-label={t("routingProviderName")} onChange={(event) => setProviderEdit({ ...providerEdit, name: event.target.value })} />
              <Select ariaLabel={t("routingProtocol")} value={providerEdit.protocol} options={[{ value: "openai-compatible", label: "OpenAI-compatible" }, { value: "anthropic-compatible", label: "Anthropic-compatible" }]} onChange={(protocol) => setProviderEdit({ ...providerEdit, protocol })} />
              <TextField value={providerEdit.baseUrl} aria-label={t("routingEndpoint")} onChange={(event) => setProviderEdit({ ...providerEdit, baseUrl: event.target.value })} />
              <TextField value={providerEdit.models} aria-label={t("routingProviderModels")} onChange={(event) => setProviderEdit({ ...providerEdit, models: event.target.value })} />
            </div> : <div className="routing-resource-main"><strong>{provider.name}</strong><span className="routing-resource-meta">{provider.protocol} · {provider.baseUrl}</span><span className="routing-resource-meta">{provider.models.length ? `${t("routingProviderModels")}: ${provider.models.join(", ")}` : ""}</span><span className="routing-resource-meta">{provider.credentialStatus === "configured" || provider.credentialStatus === "legacy-environment" ? t("routingCredentialConfigured") : t("routingCredentialMissing")}</span></div>}
            <Badge>{provider.enabled ? t("routingEnabled") : t("routingDisabled")}</Badge>
            {!readonly && <div className="routing-resource-actions">
              {editingProviderId === provider.id && providerEdit ? <>
                <Button variant="primary" disabled={pending === provider.id || !providerEdit.name.trim() || !providerEdit.baseUrl.trim()} onClick={() => void saveEdit(provider.id)}><Icon name="check" />{t("routingSave")}</Button>
                <Button variant="secondary" disabled={pending === provider.id} onClick={() => { setEditingProviderId(null); setProviderEdit(undefined); }}><Icon name="close" />{t("routingCancel")}</Button>
              </> : <>
              <TextField type="password" value={credentials[provider.id] ?? ""} placeholder={t("routingCredentialPlaceholder")} aria-label={`${t("routingCredential")} ${provider.name}`} onChange={(event) => setCredentials((current) => ({ ...current, [provider.id]: event.target.value }))} />
              <Button variant="secondary" disabled={pending === provider.id || !(credentials[provider.id] ?? "").trim()} onClick={() => void setCredential(provider.id)}><Icon name="shield" />{t("routingSetCredential")}</Button>
              <Button variant="secondary" disabled={pending === provider.id} onClick={() => beginEdit(provider)}><Icon name="settings" />{t("routingEdit")}</Button>
              <Button variant="secondary" disabled={pending === provider.id} onClick={() => void toggleProvider(provider)}>{provider.enabled ? t("routingEnabled") : t("routingDisabled")}</Button>
              <IconButton icon="trash" label={t("routingDelete")} disabled={pending === provider.id} onClick={() => setDeleteProviderId(provider.id)} />
              </>}
            </div>}
          </article>
        ))}
      </div>
      {!readonly && <div className="routing-create-form">
        <TextField value={draft.id} placeholder={t("routingProviderId")} aria-label={t("routingProviderId")} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} />
        <TextField value={draft.name} placeholder={t("routingProviderName")} aria-label={t("routingProviderName")} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <Select ariaLabel={t("routingProtocol")} value={draft.protocol} options={[{ value: "openai-compatible", label: "OpenAI-compatible" }, { value: "anthropic-compatible", label: "Anthropic-compatible" }]} onChange={(protocol) => setDraft((current) => ({ ...current, protocol }))} />
        <TextField value={draft.baseUrl} placeholder={t("routingEndpoint")} aria-label={t("routingEndpoint")} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} />
        <TextField value={draft.credentialRef} placeholder="env:PROVIDER_KEY" aria-label={t("routingCredentialRef")} onChange={(event) => setDraft((current) => ({ ...current, credentialRef: event.target.value }))} />
        <TextField value={draft.models} placeholder={t("routingProviderModels")} aria-label={t("routingProviderModels")} onChange={(event) => setDraft((current) => ({ ...current, models: event.target.value }))} />
        <Button variant="primary" disabled={pending === "create" || !draft.id.trim() || !draft.name.trim() || !draft.baseUrl.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateProvider")}</Button>
        <small className="routing-resource-meta">{t("routingCredentialRefHint")} {t("routingCredentialStorageHint")}</small>
      </div>}
      {deleteProviderId && <ActionDialog
        title={t("routingProviderDeleteTitle")}
        description={t("routingProviderDeleteDescription", { name: providers.find((provider) => provider.id === deleteProviderId)?.name ?? deleteProviderId })}
        confirmLabel={t("routingDelete")}
        danger
        onClose={() => setDeleteProviderId(undefined)}
        onConfirm={async () => { await remove(deleteProviderId); setDeleteProviderId(undefined); }}
      />}
    </div>
  );
}

function parseModels(value: string) {
  return [...new Set(value.split(",").map((model) => model.trim()).filter(Boolean))];
}

function ModelDeploymentsSettings({ providers, profiles, deployments, readonly, onRefresh }: { providers: ModelProviderSummary[]; profiles: CliProfileV2[]; deployments: ModelDeploymentSummary[]; readonly: boolean; onRefresh: () => Promise<void> }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const feedback = useFeedback();
  const [draft, setDraft] = useState({ name: "", providerId: providers[0]?.id ?? "", profileId: profiles[0]?.id ?? "", modelId: providers[0]?.models[0] ?? "" });
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; providerId: string; profileId: string; modelId: string }>();
  const [deleteDeploymentId, setDeleteDeploymentId] = useState<string>();
  const providerOptions = providers.map((provider) => ({ value: provider.id, label: provider.name }));
  const profileOptions = profiles.map((profile) => ({ value: profile.id, label: profile.name }));

  useEffect(() => {
    setDraft((current) => ({ ...current, providerId: current.providerId || providers[0]?.id || "", profileId: current.profileId || profiles[0]?.id || "", modelId: current.modelId || providers[0]?.models[0] || "" }));
  }, [providers, profiles]);

  const create = async () => {
    if (!draft.name.trim() || !draft.providerId || !draft.profileId || !draft.modelId.trim()) return;
    setPending(true);
    try { await runtime.routing.createModelDeployment({ id: `deployment-${Date.now()}`, name: draft.name.trim(), providerId: draft.providerId, profileId: draft.profileId, modelId: draft.modelId.trim(), enabled: true }); await onRefresh(); setDraft((current) => ({ ...current, name: "", modelId: "" })); feedback.success({ title: t("routingSaved") }); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", "model-routing:deployment-create")); }
    finally { setPending(false); }
  };

  const beginEdit = (deployment: ModelDeploymentSummary) => {
    setEditingId(deployment.id);
    setEditDraft({ name: deployment.name, providerId: deployment.providerId, profileId: deployment.profileId, modelId: deployment.modelId });
  };

  const saveEdit = async (deploymentId: string) => {
    if (!editDraft?.name.trim() || !editDraft.modelId.trim()) return;
    setPending(true);
    try {
      await runtime.routing.updateModelDeployment(deploymentId, { name: editDraft.name.trim(), providerId: editDraft.providerId, profileId: editDraft.profileId, modelId: editDraft.modelId.trim() });
      await onRefresh();
      setEditingId(null);
      setEditDraft(undefined);
      feedback.success({ title: t("routingSaved") });
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:deployment-update:${deploymentId}`)); }
    finally { setPending(false); }
  };

  const toggleEnabled = async (deployment: ModelDeploymentSummary) => {
    setPending(true);
    try { await runtime.routing.updateModelDeployment(deployment.id, { enabled: !deployment.enabled }); await onRefresh(); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:deployment-enabled:${deployment.id}`)); }
    finally { setPending(false); }
  };

  return <div className="routing-view" data-model-routing-view="deployments">
    {!deployments.length && <EmptyState icon="server" title={t("routingEmpty")} description={providers.length ? t("routingNoDeployments") : t("routingNoProviders")} />}
    <div className="routing-resource-list">{deployments.map((deployment) => {
      const isEditing = editingId === deployment.id && editDraft;
      return <article className="routing-resource-row" key={deployment.id} data-deployment-id={deployment.id}>
        <div className="routing-resource-main">
          {isEditing ? <div className="routing-provider-edit-form">
            <TextField value={editDraft.name} aria-label={t("routingDeploymentName")} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} />
            <Select ariaLabel={t("routingDeploymentProvider")} value={editDraft.providerId} options={providerOptions} onChange={(providerId) => setEditDraft({ ...editDraft, providerId })} />
            <Select ariaLabel={t("routingDeploymentProfile")} value={editDraft.profileId} options={profileOptions} onChange={(profileId) => setEditDraft({ ...editDraft, profileId })} />
            <TextField value={editDraft.modelId} aria-label={t("routingDeploymentModel")} onChange={(event) => setEditDraft({ ...editDraft, modelId: event.target.value })} />
          </div> : <><strong>{deployment.name}</strong><span className="routing-resource-meta">{deployment.providerName ?? deployment.providerId} · {deployment.profileName ?? deployment.profileId} · {deployment.modelId}</span><span className="routing-resource-meta">{deployment.exclusionCodes.length ? `${t("routingExcluded")}: ${deployment.exclusionCodes.join(", ")}` : t("routingEligible")}</span></>}
        </div>
        <Badge>{deployment.eligibility}</Badge>
        {!readonly && <div className="routing-resource-actions">
          {isEditing ? <>
            <Button variant="primary" disabled={pending || !editDraft.name.trim() || !editDraft.modelId.trim()} onClick={() => void saveEdit(deployment.id)}><Icon name="check" />{t("routingSave")}</Button>
            <Button variant="secondary" disabled={pending} onClick={() => { setEditingId(null); setEditDraft(undefined); }}><Icon name="close" />{t("routingCancel")}</Button>
          </> : <>
            {!deployment.archivedAt && <Button variant="secondary" disabled={pending} onClick={() => beginEdit(deployment)}><Icon name="settings" />{t("routingEdit")}</Button>}
            {!deployment.archivedAt && <Button variant="secondary" disabled={pending} onClick={() => void toggleEnabled(deployment)}>{deployment.enabled ? t("routingEnabled") : t("routingDisabled")}</Button>}
            <IconButton icon="trash" label={t("routingDelete")} disabled={pending || Boolean(deployment.archivedAt)} onClick={() => setDeleteDeploymentId(deployment.id)} />
          </>}
        </div>}
      </article>;
    })}</div>
    {!readonly && providers.length > 0 && profiles.length > 0 && <div className="routing-create-form">
      <TextField value={draft.name} placeholder={t("routingDeploymentName")} aria-label={t("routingDeploymentName")} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
      <Select ariaLabel={t("routingDeploymentProvider")} value={draft.providerId} options={providerOptions} onChange={(providerId) => setDraft((current) => ({ ...current, providerId }))} />
      <Select ariaLabel={t("routingDeploymentProfile")} value={draft.profileId} options={profileOptions} onChange={(profileId) => setDraft((current) => ({ ...current, profileId }))} />
      <TextField value={draft.modelId} placeholder={t("routingDeploymentModel")} aria-label={t("routingDeploymentModel")} onChange={(event) => setDraft((current) => ({ ...current, modelId: event.target.value }))} />
      <Button variant="primary" disabled={pending || !draft.name.trim() || !draft.modelId.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateDeployment")}</Button>
    </div>}
    {deleteDeploymentId && <ActionDialog
      title={t("routingDeploymentDeleteTitle")}
      description={t("routingDeploymentDeleteDescription", { name: deployments.find((deployment) => deployment.id === deleteDeploymentId)?.name ?? deleteDeploymentId })}
      confirmLabel={t("routingDelete")}
      danger
      onClose={() => setDeleteDeploymentId(undefined)}
      onConfirm={async () => {
        try {
          await runtime.routing.deleteModelDeployment(deleteDeploymentId);
          await onRefresh();
          setDeleteDeploymentId(undefined);
        } catch (cause) {
          feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:deployment-delete:${deleteDeploymentId}`));
          throw cause;
        }
      }}
    />}
  </div>;
}

function ModelRoutesSettings({ routes, deployments, readonly, onRefresh }: { routes: PriorityModelRoute[]; deployments: ModelDeploymentSummary[]; readonly: boolean; onRefresh: () => Promise<void> }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const feedback = useFeedback();
  const [name, setName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [automaticFallback, setAutomaticFallback] = useState(true);
  const [primaryDeploymentId, setPrimaryDeploymentId] = useState(deployments[0]?.id ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; enabled: boolean; automaticTechnicalFallback: boolean; candidateDeploymentIds: string[] }>();
  const [announcement, setAnnouncement] = useState("");
  const [deleteRouteId, setDeleteRouteId] = useState<string>();
  const editButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const deploymentOptions = deployments.map((deployment) => ({ value: deployment.id, label: deployment.name }));

  useEffect(() => {
    setPrimaryDeploymentId((current) => current && deployments.some((deployment) => deployment.id === current) ? current : deployments[0]?.id ?? "");
  }, [deployments]);

  const create = async () => {
    if (!name.trim() || !primaryDeploymentId) return;
    setPending("create");
    const candidateDeploymentIds = [primaryDeploymentId, ...deployments.filter((deployment) => deployment.id !== primaryDeploymentId).slice(0, 7).map((deployment) => deployment.id)];
    try { await runtime.routing.createModelRoute({ id: `route-${Date.now()}`, name: name.trim(), enabled: true, candidateDeploymentIds, automaticTechnicalFallback: automaticFallback }); await onRefresh(); setName(""); feedback.success({ title: t("routingSaved") }); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", "model-routing:route-create")); }
    finally { setPending(null); }
  };

  const beginEdit = (route: PriorityModelRoute) => {
    setEditing(route.id);
    setDraft({ name: route.name, enabled: route.enabled, automaticTechnicalFallback: route.automaticTechnicalFallback, candidateDeploymentIds: [...route.candidateDeploymentIds] });
  };

  const cancelEdit = (routeId: string) => {
    setEditing(null);
    setDraft(undefined);
    requestAnimationFrame(() => editButtons.current[routeId]?.focus());
  };

  const saveEdit = async (route: PriorityModelRoute) => {
    if (!draft?.name.trim() || !draft.candidateDeploymentIds.length || draft.candidateDeploymentIds.length > 8) return;
    setPending(route.id);
    try {
      await runtime.routing.updateModelRoute(route.id, { name: draft.name.trim(), enabled: draft.enabled, automaticTechnicalFallback: draft.automaticTechnicalFallback, candidateDeploymentIds: draft.candidateDeploymentIds });
      await onRefresh();
      setEditing(null);
      setDraft(undefined);
      feedback.success({ title: t("routingSaved") });
      requestAnimationFrame(() => editButtons.current[route.id]?.focus());
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:route-update:${route.id}`)); }
    finally { setPending(null); }
  };

  const toggleEnabled = async (route: PriorityModelRoute) => {
    setPending(route.id);
    try { await runtime.routing.updateModelRoute(route.id, { enabled: !route.enabled }); await onRefresh(); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:route-enabled:${route.id}`)); }
    finally { setPending(null); }
  };

  const moveDraft = (routeId: string, index: number, delta: -1 | 1) => {
    if (editing !== routeId || !draft) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= draft.candidateDeploymentIds.length) return;
    const candidateDeploymentIds = [...draft.candidateDeploymentIds];
    [candidateDeploymentIds[index], candidateDeploymentIds[nextIndex]] = [candidateDeploymentIds[nextIndex], candidateDeploymentIds[index]];
    setDraft({ ...draft, candidateDeploymentIds });
    setAnnouncement(t("routingRouteMoved", { position: nextIndex + 1 }));
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-route-id="${routeId}"] [data-route-candidate-index="${nextIndex + 1}"] button`)?.focus());
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!draft || !editing || !event.over || event.active.id === event.over.id) return;
    const from = draft.candidateDeploymentIds.indexOf(String(event.active.id));
    const to = draft.candidateDeploymentIds.indexOf(String(event.over.id));
    if (from < 0 || to < 0) return;
    const candidateDeploymentIds = [...draft.candidateDeploymentIds];
    const [moved] = candidateDeploymentIds.splice(from, 1);
    candidateDeploymentIds.splice(to, 0, moved);
    setDraft({ ...draft, candidateDeploymentIds });
    setAnnouncement(t("routingRouteMoved", { position: to + 1 }));
  };

  const removeDraftCandidate = (index: number) => {
    if (!draft || draft.candidateDeploymentIds.length <= 1) return;
    setDraft({ ...draft, candidateDeploymentIds: draft.candidateDeploymentIds.filter((_, candidateIndex) => candidateIndex !== index) });
  };

  const addDraftCandidate = (deploymentId: string) => {
    if (!draft || !deploymentId || draft.candidateDeploymentIds.includes(deploymentId) || draft.candidateDeploymentIds.length >= 8) return;
    setDraft({ ...draft, candidateDeploymentIds: [...draft.candidateDeploymentIds, deploymentId] });
  };

  return <div className="routing-view" data-model-routing-view="routes">
    {!routes.length && <EmptyState icon="target" title={t("routingEmpty")} description={deployments.length ? t("routingNoRoutes") : t("routingNoDeployments")} />}
    <div className="routing-resource-list">{routes.map((route) => {
      const isEditing = editing === route.id && draft !== undefined;
      const candidateDeploymentIds = isEditing ? draft.candidateDeploymentIds : route.candidateDeploymentIds;
      const availableCandidates = deployments.filter((deployment) => !candidateDeploymentIds.includes(deployment.id)).map((deployment) => ({ value: deployment.id, label: deployment.name }));
      return <article className="routing-resource-row routing-route-row" key={route.id} data-route-id={route.id}>
        <div className="routing-resource-main">
          {isEditing ? <TextField value={draft.name} aria-label={t("routingRouteName")} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <strong>{route.name}</strong>}
          <span className="routing-resource-meta">{t("routingRouteCandidates")}: {candidateDeploymentIds.length}/8</span>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={candidateDeploymentIds} strategy={verticalListSortingStrategy}>
              <ol className="routing-candidate-list">{candidateDeploymentIds.map((deploymentId, index) => <SortableRouteCandidate key={deploymentId} id={deploymentId} index={index} isLast={index === candidateDeploymentIds.length - 1} label={deployments.find((deployment) => deployment.id === deploymentId)?.name ?? deploymentId} editing={isEditing} readonly={readonly} pending={pending === route.id} canRemove={candidateDeploymentIds.length > 1} onMove={(delta) => moveDraft(route.id, index, delta)} onRemove={() => removeDraftCandidate(index)} t={t} />)}</ol>
            </SortableContext>
          </DndContext>
          {isEditing && <div className="routing-route-editor-controls">
            <Select ariaLabel={t("routingAddCandidate")} value="" options={[{ value: "", label: t("routingAddCandidate"), disabled: true }, ...availableCandidates]} disabled={availableCandidates.length === 0 || candidateDeploymentIds.length >= 8} onChange={addDraftCandidate} />
            {candidateDeploymentIds.length >= 8 && <small className="routing-resource-meta">{t("routingCandidateLimit")}</small>}
            {candidateDeploymentIds.length <= 1 && <small className="routing-resource-meta">{t("routingCandidateMinimum")}</small>}
          </div>}
          <div className="routing-route-announcement" aria-live="polite">{announcement}</div>
        </div>
        <div className="routing-route-status">
          <Badge>{route.enabled ? t("routingEnabled") : t("routingDisabled")}</Badge>
          <Badge>{route.automaticTechnicalFallback ? t("routingAutomaticFallback") : t("routingDisabled")}</Badge>
          {!readonly && (isEditing ? <>
            <Button variant="primary" disabled={pending === route.id || !draft.name.trim() || draft.candidateDeploymentIds.length === 0} onClick={() => void saveEdit(route)}><Icon name="check" />{t("routingSave")}</Button>
            <Button variant="secondary" disabled={pending === route.id} onClick={() => cancelEdit(route.id)}><Icon name="close" />{t("routingCancel")}</Button>
            <Button variant={draft.enabled ? "secondary" : "primary"} aria-pressed={draft.enabled} disabled={pending === route.id} onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}>{draft.enabled ? t("routingRouteEnabled") : t("routingRouteDisabled")}</Button>
            <Button variant={draft.automaticTechnicalFallback ? "primary" : "secondary"} aria-pressed={draft.automaticTechnicalFallback} disabled={pending === route.id} onClick={() => setDraft({ ...draft, automaticTechnicalFallback: !draft.automaticTechnicalFallback })}><Icon name="refresh" />{t("routingAutomaticFallback")}</Button>
          </> : <>
            <Button variant="secondary" ref={(element) => { editButtons.current[route.id] = element; }} onClick={() => beginEdit(route)}><Icon name="settings" />{t("routingEdit")}</Button>
            <Button variant="secondary" disabled={pending === route.id} onClick={() => void toggleEnabled(route)}>{route.enabled ? t("routingRouteEnabled") : t("routingRouteDisabled")}</Button>
          </>)}
          {!readonly && !isEditing && <IconButton icon="trash" label={t("routingDelete")} disabled={pending === route.id} onClick={() => setDeleteRouteId(route.id)} />}
        </div>
      </article>;
    })}</div>
    {!readonly && deployments.length > 0 && <div className="routing-create-form">
      <TextField value={name} placeholder={t("routingRouteName")} aria-label={t("routingRouteName")} onChange={(event) => setName(event.target.value)} />
      <Select ariaLabel={t("routingRouteCandidates")} value={primaryDeploymentId} options={deploymentOptions} onChange={setPrimaryDeploymentId} />
      <Button variant={automaticFallback ? "primary" : "secondary"} aria-pressed={automaticFallback} onClick={() => setAutomaticFallback((value) => !value)}><Icon name="refresh" />{t("routingAutomaticFallback")}</Button>
      <Button variant="primary" disabled={pending === "create" || !name.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateRoute")}</Button>
    </div>}
    {deleteRouteId && <ActionDialog
      title={t("routingRouteDeleteTitle")}
      description={t("routingRouteDeleteDescription", { name: routes.find((route) => route.id === deleteRouteId)?.name ?? deleteRouteId })}
      confirmLabel={t("routingDelete")}
      danger
      onClose={() => setDeleteRouteId(undefined)}
      onConfirm={async () => {
        try {
          await runtime.routing.deleteModelRoute(deleteRouteId);
          await onRefresh();
          setDeleteRouteId(undefined);
        } catch (cause) {
          feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:route-delete:${deleteRouteId}`));
          throw cause;
        }
      }}
    />}
  </div>;
}

function SortableRouteCandidate({ id, index, isLast, label, editing, readonly, pending, canRemove, onMove, onRemove, t }: { id: string; index: number; isLast: boolean; label: string; editing: boolean; readonly: boolean; pending: boolean; canRemove: boolean; onMove: (delta: -1 | 1) => void; onRemove: () => void; t: ReturnType<typeof useI18n>["t"] }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-deployment-id={id} data-route-candidate-index={index + 1}>
    {editing && <Button unstyled className="routing-drag-handle" aria-label={t("routingReorder")} {...attributes} {...listeners}><Icon name="menu" /></Button>}
    <span>{label}</span>
    {editing && <span className="routing-candidate-actions">
      <IconButton icon="arrow-up" label={t("moveUp")} disabled={readonly || pending || index === 0} onClick={() => onMove(-1)} />
      <IconButton icon="chevron-down" label={t("moveDown")} disabled={readonly || pending || isLast} onClick={() => onMove(1)} />
      <IconButton icon="trash" label={t("routingRemoveCandidate")} disabled={readonly || pending || !canRemove} onClick={onRemove} />
    </span>}
  </li>;
}
