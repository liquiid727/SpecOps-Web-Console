import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

export function KnowledgeView() {
  const { t } = useI18n();
  return (
    <div className="knowledge-view">
      <div className="view-header">
        <h2><Icon name="book" />{t("qoderKnowledge")}</h2>
      </div>
      <div className="view-content">
        <div className="empty-state">
          <Icon name="book" />
          <h3>{t("qoderKnowledgeTitle")}</h3>
          <p>{t("qoderKnowledgeDescription")}</p>
        </div>
      </div>
    </div>
  );
}
