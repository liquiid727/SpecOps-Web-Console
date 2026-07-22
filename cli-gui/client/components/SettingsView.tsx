import { useState } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

type SettingsTab = "account" | "models" | "mcp" | "security";

export function SettingsView() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "account", label: t("qoderSettingsAccount"), icon: "user" },
    { id: "models", label: t("qoderSettingsModels"), icon: "bot" },
    { id: "mcp", label: t("qoderSettingsMcp"), icon: "settings" },
    { id: "security", label: t("qoderSettingsSecurity"), icon: "shield" },
  ];

  return (
    <div className="settings-view">
      <div className="view-header">
        <h2><Icon name="settings" />{t("qoderSettings")}</h2>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon as any} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="settings-panel">
          {activeTab === "account" && (
            <div className="settings-section">
              <h3>{t("qoderSettingsAccount")}</h3>
              <p className="settings-description">{t("qoderAccountDescription")}</p>
            </div>
          )}
          {activeTab === "models" && (
            <div className="settings-section">
              <h3>{t("qoderSettingsModels")}</h3>
              <p className="settings-description">{t("qoderModelsDescription")}</p>
            </div>
          )}
          {activeTab === "mcp" && (
            <div className="settings-section">
              <h3>{t("qoderSettingsMcp")}</h3>
              <p className="settings-description">{t("qoderMcpDescription")}</p>
            </div>
          )}
          {activeTab === "security" && (
            <div className="settings-section">
              <h3>{t("qoderSettingsSecurity")}</h3>
              <p className="settings-description">{t("qoderSecurityDescription")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
