import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui";

interface TitleBarProps {
  title?: string;
  workspaceName?: string;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  /** 会话级操作（中间视图切换 / 状态 / Resume / Stop）由 App 注入，保持单一 header 行 */
  children?: ReactNode;
}

// 参考 Qoder 桌面壳：左列（红绿灯 + 折叠 + 搜索）与侧栏同色融合，标题行归属内容列
export function TitleBar({ title, workspaceName, sidebarOpen, rightPanelOpen, onToggleSidebar, onToggleRightPanel, children }: TitleBarProps) {
  const { t } = useI18n();
  return <header className={`qoder-titlebar${sidebarOpen ? " with-sidebar" : ""}`}>
    <div className="titlebar-zone titlebar-sidebar-zone">
      <div className="traffic-lights" aria-hidden="true"><span className="traffic-red" /><span className="traffic-yellow" /><span className="traffic-green" /></div>
      <IconButton appearance="qoder" icon={sidebarOpen ? "panel-left-close" : "panel-left"} label={t("qoderToggleSidebar")} aria-pressed={sidebarOpen} onClick={onToggleSidebar} />
      <IconButton appearance="qoder" icon="search" label={t("qoderGlobalSearch")} disabled title={t("qoderComingSoon")} />
    </div>
    <div className="titlebar-zone titlebar-main-zone">
      <div className="titlebar-workspace" title={[title, workspaceName].filter(Boolean).join(" — ")}>
        <strong>{title ?? workspaceName ?? t("brandTitle")}</strong>
        {title && workspaceName && <small><Icon name="folder" />{workspaceName}</small>}
      </div>
      <div className="titlebar-actions">
        {children}
        <IconButton appearance="qoder" icon={rightPanelOpen ? "panel-right-close" : "panel-right"} label={t("qoderToggleRightPanel")} aria-pressed={rightPanelOpen} onClick={onToggleRightPanel} />
      </div>
    </div>
  </header>;
}
