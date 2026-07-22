import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

export function MarketplaceView() {
  const { t } = useI18n();
  return (
    <div className="marketplace-view">
      <div className="view-header">
        <h2><Icon name="shopping" />{t("qoderMarketplace")}</h2>
      </div>
      <div className="view-content">
        <div className="empty-state">
          <Icon name="shopping" />
          <h3>{t("qoderMarketplaceTitle")}</h3>
          <p>{t("qoderMarketplaceDescription")}</p>
        </div>
      </div>
    </div>
  );
}
