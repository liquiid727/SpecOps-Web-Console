import { useEffect, useMemo, useState } from "react";
import type { ModelProviderSummary } from "../../shared/model-provider";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { PriorityModelRoute } from "../../shared/model-route";
import type { CliProfileV2 } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useClientRuntime } from "../runtime/client-runtime";
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
  const [draft, setDraft] = useState({ id: "", name: "", protocol: "openai-compatible", baseUrl: "" });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);

  const create = async () => {
    if (!draft.id.trim() || !draft.name.trim() || !draft.baseUrl.trim()) return;
    setPending("create");
    try {
      await runtime.routing.createProvider({ ...draft, id: draft.id.trim(), name: draft.name.trim(), baseUrl: draft.baseUrl.trim() });
      setDraft({ id: "", name: "", protocol: "openai-compatible", baseUrl: "" });
      feedback.success({ title: t("routingSaved") });
      await onRefresh();
    } catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", "model-routing:provider-create")); }
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
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:provider-delete:${providerId}`)); }
    finally { setPending(null); }
  };

  return (
    <div className="routing-view" data-model-routing-view="providers">
      {!providers.length && <EmptyState icon="bot" title={t("routingEmpty")} description={t("routingNoProviders")} />}
      <div className="routing-resource-list">
        {providers.map((provider) => (
          <article className="routing-resource-row" key={provider.id} data-provider-id={provider.id}>
            <div className="routing-resource-main"><strong>{provider.name}</strong><span className="routing-resource-meta">{provider.protocol} · {provider.baseUrl}</span><span className="routing-resource-meta">{provider.credentialStatus === "configured" || provider.credentialStatus === "legacy-environment" ? t("routingCredentialConfigured") : t("routingCredentialMissing")}</span></div>
            <Badge>{provider.enabled ? t("routingEnabled") : t("routingDisabled")}</Badge>
            {!readonly && <div className="routing-resource-actions">
              <TextField type="password" value={credentials[provider.id] ?? ""} placeholder={t("routingCredentialPlaceholder")} aria-label={`${t("routingCredential")} ${provider.name}`} onChange={(event) => setCredentials((current) => ({ ...current, [provider.id]: event.target.value }))} />
              <Button variant="secondary" disabled={pending === provider.id || !(credentials[provider.id] ?? "").trim()} onClick={() => void setCredential(provider.id)}><Icon name="shield" />{t("routingSetCredential")}</Button>
              <IconButton icon="trash" label={t("routingDelete")} disabled={pending === provider.id} onClick={() => void remove(provider.id)} />
            </div>}
          </article>
        ))}
      </div>
      {!readonly && <div className="routing-create-form">
        <TextField value={draft.id} placeholder={t("routingProviderId")} aria-label={t("routingProviderId")} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} />
        <TextField value={draft.name} placeholder={t("routingProviderName")} aria-label={t("routingProviderName")} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <Select ariaLabel={t("routingProtocol")} value={draft.protocol} options={[{ value: "openai-compatible", label: "OpenAI-compatible" }, { value: "anthropic-compatible", label: "Anthropic-compatible" }]} onChange={(protocol) => setDraft((current) => ({ ...current, protocol }))} />
        <TextField value={draft.baseUrl} placeholder={t("routingEndpoint")} aria-label={t("routingEndpoint")} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} />
        <Button variant="primary" disabled={pending === "create" || !draft.id.trim() || !draft.name.trim() || !draft.baseUrl.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateProvider")}</Button>
      </div>}
    </div>
  );
}

function ModelDeploymentsSettings({ providers, profiles, deployments, readonly, onRefresh }: { providers: ModelProviderSummary[]; profiles: CliProfileV2[]; deployments: ModelDeploymentSummary[]; readonly: boolean; onRefresh: () => Promise<void> }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const feedback = useFeedback();
  const [draft, setDraft] = useState({ name: "", providerId: providers[0]?.id ?? "", profileId: profiles[0]?.id ?? "", modelId: providers[0]?.models[0] ?? "" });
  const [pending, setPending] = useState(false);
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

  return <div className="routing-view" data-model-routing-view="deployments">
    {!deployments.length && <EmptyState icon="server" title={t("routingEmpty")} description={providers.length ? t("routingNoDeployments") : t("routingNoProviders")} />}
    <div className="routing-resource-list">{deployments.map((deployment) => <article className="routing-resource-row" key={deployment.id} data-deployment-id={deployment.id}>
      <div className="routing-resource-main"><strong>{deployment.name}</strong><span className="routing-resource-meta">{deployment.providerName ?? deployment.providerId} · {deployment.profileName ?? deployment.profileId} · {deployment.modelId}</span><span className="routing-resource-meta">{deployment.exclusionCodes.length ? `${t("routingExcluded")}: ${deployment.exclusionCodes.join(", ")}` : t("routingEligible")}</span></div>
      <Badge>{deployment.eligibility}</Badge>
      {!readonly && <IconButton icon="trash" label={t("routingDelete")} onClick={() => void runtime.routing.deleteModelDeployment(deployment.id).then(onRefresh).catch((cause) => feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:deployment-delete:${deployment.id}`)))} />}
    </article>)}</div>
    {!readonly && providers.length > 0 && profiles.length > 0 && <div className="routing-create-form">
      <TextField value={draft.name} placeholder={t("routingDeploymentName")} aria-label={t("routingDeploymentName")} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
      <Select ariaLabel={t("routingDeploymentProvider")} value={draft.providerId} options={providerOptions} onChange={(providerId) => setDraft((current) => ({ ...current, providerId }))} />
      <Select ariaLabel={t("routingDeploymentProfile")} value={draft.profileId} options={profileOptions} onChange={(profileId) => setDraft((current) => ({ ...current, profileId }))} />
      <TextField value={draft.modelId} placeholder={t("routingDeploymentModel")} aria-label={t("routingDeploymentModel")} onChange={(event) => setDraft((current) => ({ ...current, modelId: event.target.value }))} />
      <Button variant="primary" disabled={pending || !draft.name.trim() || !draft.modelId.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateDeployment")}</Button>
    </div>}
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

  const updateCandidates = async (route: PriorityModelRoute, candidateDeploymentIds: string[]) => {
    setPending(route.id);
    try { await runtime.routing.updateModelRoute(route.id, { candidateDeploymentIds }); await onRefresh(); }
    catch (cause) { feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:route-update:${route.id}`)); }
    finally { setPending(null); }
  };

  const move = (route: PriorityModelRoute, index: number, delta: -1 | 1) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= route.candidateDeploymentIds.length) return;
    const candidateDeploymentIds = [...route.candidateDeploymentIds];
    [candidateDeploymentIds[index], candidateDeploymentIds[nextIndex]] = [candidateDeploymentIds[nextIndex], candidateDeploymentIds[index]];
    void updateCandidates(route, candidateDeploymentIds);
  };

  return <div className="routing-view" data-model-routing-view="routes">
    {!routes.length && <EmptyState icon="target" title={t("routingEmpty")} description={deployments.length ? t("routingNoRoutes") : t("routingNoDeployments")} />}
    <div className="routing-resource-list">{routes.map((route) => <article className="routing-resource-row routing-route-row" key={route.id} data-route-id={route.id}>
      <div className="routing-resource-main"><strong>{route.name}</strong><span className="routing-resource-meta">{t("routingRouteCandidates")}: {route.candidateDeploymentIds.length}</span>
        <ol className="routing-candidate-list">{route.candidateDeploymentIds.map((deploymentId, index) => <li key={deploymentId} data-deployment-id={deploymentId}><span>{deployments.find((deployment) => deployment.id === deploymentId)?.name ?? deploymentId}</span><span className="routing-candidate-actions"><IconButton icon="arrow-up" label={t("moveUp")} disabled={readonly || pending === route.id || index === 0} onClick={() => move(route, index, -1)} /><IconButton icon="chevron-down" label={t("moveDown")} disabled={readonly || pending === route.id || index === route.candidateDeploymentIds.length - 1} onClick={() => move(route, index, 1)} /></span></li>)}</ol>
      </div>
      <div className="routing-route-status"><Badge>{route.automaticTechnicalFallback ? t("routingAutomaticFallback") : t("routingDisabled")}</Badge>{!readonly && <IconButton icon="trash" label={t("routingDelete")} onClick={() => void runtime.routing.deleteModelRoute(route.id).then(onRefresh).catch((cause) => feedback.error(toFeedbackError(cause, t, "routingLoadFailed", `model-routing:route-delete:${route.id}`)))} />}</div>
    </article>)}</div>
    {!readonly && deployments.length > 0 && <div className="routing-create-form">
      <TextField value={name} placeholder={t("routingRouteName")} aria-label={t("routingRouteName")} onChange={(event) => setName(event.target.value)} />
      <Select ariaLabel={t("routingRouteCandidates")} value={primaryDeploymentId} options={deploymentOptions} onChange={setPrimaryDeploymentId} />
      <Button variant={automaticFallback ? "primary" : "secondary"} aria-pressed={automaticFallback} onClick={() => setAutomaticFallback((value) => !value)}><Icon name="refresh" />{t("routingAutomaticFallback")}</Button>
      <Button variant="primary" disabled={pending === "create" || !name.trim()} onClick={() => void create()}><Icon name="add" />{t("routingCreateRoute")}</Button>
    </div>}
  </div>;
}
