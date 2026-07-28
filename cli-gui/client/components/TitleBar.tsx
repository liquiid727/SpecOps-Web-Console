import { useI18n } from "../i18n";
import { Button, IconButton } from "./ui";

interface TitleBarProps {
  title?: string;
  workspaceName?: string;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
}

export function TitleBar({ title, workspaceName, sidebarOpen, rightPanelOpen, onToggleSidebar, onToggleRightPanel }: TitleBarProps) {
  const { t } = useI18n();
  return <header className="qoder-titlebar">
    <div className="titlebar-group">
      <div className="traffic-lights" aria-hidden="true"><span className="traffic-red" /><span className="traffic-yellow" /><span className="traffic-green" /></div>
      <IconButton appearance="qoder" icon={sidebarOpen ? "panel-left-close" : "panel-left"} label={t("qoderToggleSidebar")} aria-pressed={sidebarOpen} onClick={onToggleSidebar} />
      <IconButton appearance="qoder" icon="search" label={t("qoderGlobalSearch")} disabled title={t("qoderComingSoon")} />
    </div>
    <div className="titlebar-workspace" title={[title, workspaceName].filter(Boolean).join(" — ")}><strong>{title ?? workspaceName ?? t("brandTitle")}</strong>{title && workspaceName && <small>{workspaceName}</small>}</div>
    <div className="titlebar-group titlebar-actions">
      <IconButton appearance="qoder" icon={rightPanelOpen ? "panel-right-close" : "panel-right"} label={t("qoderToggleRightPanel")} aria-pressed={rightPanelOpen} onClick={onToggleRightPanel} />
      <IconButton appearance="qoder" icon="bell" label={t("qoderNotifications")} disabled title={t("qoderComingSoon")} />
      <Button variant="ghost" className="qoder-avatar" aria-label={t("qoderUserMenu")} disabled><span>L</span></Button>
    </div>
  </header>;
}
