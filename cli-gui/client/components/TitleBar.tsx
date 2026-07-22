import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface TitleBarProps {
  workspaceName?: string;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
}

export function TitleBar({ workspaceName, sidebarOpen, rightPanelOpen, onToggleSidebar, onToggleRightPanel }: TitleBarProps) {
  const { t } = useI18n();
  return <header className="qoder-titlebar">
    <div className="titlebar-group">
      <div className="traffic-lights" aria-hidden="true"><span className="traffic-red" /><span className="traffic-yellow" /><span className="traffic-green" /></div>
      <button className="qoder-icon-button" type="button" aria-label={t("qoderToggleSidebar")} aria-pressed={sidebarOpen} onClick={onToggleSidebar}><Icon name={sidebarOpen ? "panel-left-close" : "panel-left"} /></button>
      <button className="qoder-icon-button" type="button" aria-label={t("qoderGlobalSearch")} disabled title={t("qoderComingSoon")}><Icon name="search" /></button>
    </div>
    <div className="titlebar-workspace" title={workspaceName}>{workspaceName ?? t("brandTitle")}</div>
    <div className="titlebar-group titlebar-actions">
      <button className="qoder-icon-button" type="button" aria-label={t("qoderToggleRightPanel")} aria-pressed={rightPanelOpen} onClick={onToggleRightPanel}><Icon name={rightPanelOpen ? "panel-right-close" : "panel-right"} /></button>
      <button className="qoder-icon-button" type="button" aria-label={t("qoderNotifications")} disabled title={t("qoderComingSoon")}><Icon name="bell" /></button>
      <button className="qoder-avatar" type="button" aria-label={t("qoderUserMenu")} disabled><span>L</span></button>
    </div>
  </header>;
}
