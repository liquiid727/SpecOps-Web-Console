import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { PriorityModelRoute, ResolvedRoute, RouteBindingSource } from "../../shared/model-route";
import { useI18n } from "../i18n";
import { Badge, Icon, Select } from "./ui";

interface ResolvedRouteControlProps {
  resolvedRoute?: ResolvedRoute;
  routes?: PriorityModelRoute[];
  deployments?: ModelDeploymentSummary[];
  currentSessionRouteId?: string;
  fixedDeploymentId?: string;
  disabled?: boolean;
  onSessionRouteChange?: (routeId: string | undefined) => void;
  onFixedDeploymentChange?: (deploymentId: string | undefined) => void;
  actualDeployment?: { name: string; modelId: string };
}

export function ResolvedRouteControl({ resolvedRoute, routes = [], deployments = [], currentSessionRouteId, fixedDeploymentId, disabled = false, onSessionRouteChange, onFixedDeploymentChange, actualDeployment }: ResolvedRouteControlProps) {
  const { t } = useI18n();
  const source = routeSource(resolvedRoute);
  const route = resolvedRoute?.routeId ? routes.find((candidate) => candidate.id === resolvedRoute.routeId) : undefined;
  const preferred = deployments.find((deployment) => deployment.id === resolvedRoute?.selectedDeploymentId);
  const deploymentById = new Map(deployments.map((deployment) => [deployment.id, deployment]));
  const fixedOptions = [
    { value: "inherit", label: t("routeInherit") },
    ...(resolvedRoute?.candidates ?? []).map((candidate) => ({
      value: candidate.deploymentId,
      label: `${deploymentById.get(candidate.deploymentId)?.name ?? candidate.deploymentId}${candidate.eligible ? "" : ` (${candidate.exclusionCodes.join(", ")})`}`,
      disabled: !candidate.eligible
    }))
  ];
  const sessionOptions = [
    { value: "inherit", label: t("routeInherit") },
    ...routes.filter((candidate) => candidate.enabled && !candidate.archivedAt).map((candidate) => ({ value: candidate.id, label: candidate.name }))
  ];

  return <section className="resolved-route-control" data-route-source={source} aria-label={t("routeControlLabel")}>
    <div className="resolved-route-summary">
      <Icon name="target" />
      <div className="resolved-route-copy">
        <span className="resolved-route-label">{t("routeControlLabel")}</span>
        <strong title={route?.name ?? t(resolvedRoute?.kind === "legacy-profile-model" ? "routeLegacy" : "routeLoading")}>{route?.name ?? t(resolvedRoute?.kind === "legacy-profile-model" ? "routeLegacy" : "routeLoading")}</strong>
        <span className="resolved-route-meta">{actualDeployment ? t("routeActual", { name: actualDeployment.name, model: actualDeployment.modelId }) : preferred ? t("routePreferred", { name: preferred.name, model: preferred.modelId }) : resolvedRoute?.canSend === false ? t("routeUnavailable") : t(`routeSource${capitalize(source)}` as "routeSourceProject")}</span>
      </div>
      <Badge>{t(`routeSource${capitalize(source)}` as "routeSourceProject")}</Badge>
    </div>
    <div className="resolved-route-actions">
      {onSessionRouteChange && <label className="resolved-route-field"><span>{t("routeSessionBinding")}</span><Select ariaLabel={t("routeSessionBinding")} disabled={disabled} value={currentSessionRouteId ?? "inherit"} options={sessionOptions} onChange={(value) => onSessionRouteChange(value === "inherit" ? undefined : value)} /></label>}
      {resolvedRoute?.kind === "route" && onFixedDeploymentChange && <label className="resolved-route-field"><span>{t("routeFixedOnce")}</span><Select ariaLabel={t("routeFixedOnce")} disabled={disabled || !resolvedRoute.canSend} value={fixedDeploymentId ?? "inherit"} options={fixedOptions} onChange={(value) => onFixedDeploymentChange(value === "inherit" ? undefined : value)} /></label>}
    </div>
  </section>;
}

function routeSource(resolvedRoute: ResolvedRoute | undefined): RouteBindingSource {
  const trace = resolvedRoute?.sourceTrace.findLast((entry) => entry.field === "routeId");
  if (trace?.source === "system" || trace?.source === "global" || trace?.source === "project" || trace?.source === "session") return trace.source;
  return "project";
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
