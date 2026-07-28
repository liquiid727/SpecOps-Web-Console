import { useI18n } from "../i18n";
import { Button } from "./ui";

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  const next = language === "en" ? "zh" : "en";
  return <Button variant="ghost" className="language-toggle" onClick={() => setLanguage(next)} aria-label={t("toggleLanguage")} title={t("toggleLanguage")}>
    <span className={language === "en" ? "active" : ""}>{t("languageEnglish")}</span>
    <span className={language === "zh" ? "active" : ""}>{t("languageChinese")}</span>
  </Button>;
}
