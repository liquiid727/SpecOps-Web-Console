import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { Button, Card, EmptyState, Icon, TextField } from "./ui";
import { ViewHeader } from "./patterns";

type Category = "all" | "productivity" | "devtools" | "agents" | "themes";

const categories: { id: Category; key: string }[] = [
  { id: "all", key: "qoderCategoryAll" },
  { id: "productivity", key: "qoderCategoryProductivity" },
  { id: "devtools", key: "qoderCategoryDevTools" },
  { id: "agents", key: "qoderCategoryAgents" },
  { id: "themes", key: "qoderCategoryThemes" }
];

interface Plugin {
  id: string;
  nameKey: string;
  descKey: string;
  category: Exclude<Category, "all">;
}

const plugins: Plugin[] = [
  { id: "scheduler", nameKey: "qoderPluginName1", descKey: "qoderPluginDesc1", category: "productivity" },
  { id: "diff-reviewer", nameKey: "qoderPluginName2", descKey: "qoderPluginDesc2", category: "devtools" },
  { id: "context-miner", nameKey: "qoderPluginName3", descKey: "qoderPluginDesc3", category: "agents" },
  { id: "theme-studio", nameKey: "qoderPluginName4", descKey: "qoderPluginDesc4", category: "themes" }
];

export function MarketplaceView() {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plugins.filter((plugin) => {
      const inCategory = category === "all" || plugin.category === category;
      const inQuery = !needle || t(plugin.nameKey).toLowerCase().includes(needle) || t(plugin.descKey).toLowerCase().includes(needle);
      return inCategory && inQuery;
    });
  }, [category, query, t]);

  function toggleInstall(id: string) {
    setInstalled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="marketplace-view">
      <ViewHeader title={<><Icon name="shopping" />{t("qoderMarketplace")}</>} actions={<TextField className="view-search" type="search" aria-label={t("qoderSearchPlugins")} placeholder={t("qoderSearchPlugins")} value={query} onChange={(event) => setQuery(event.target.value)} />} />

      <div className="marketplace-body">
        <nav className="marketplace-nav" aria-label={t("qoderMarketplace")}>
          {categories.map((item) => (
            <Button variant="ghost" key={item.id} className={category === item.id ? "active" : ""} aria-current={category === item.id ? "page" : undefined} onClick={() => setCategory(item.id)}>
              {t(item.key)}
            </Button>
          ))}
        </nav>

        <section className="marketplace-grid" aria-label={t("qoderMarketplaceTitle")}>
          {visible.length === 0 && <EmptyState className="empty-state" icon={<Icon name="shopping" />} title={t("qoderNoPlugins")} />}
          {visible.map((plugin) => {
            const isInstalled = installed.has(plugin.id);
            return (
              <Card key={plugin.id} className="plugin-card">
                <header className="plugin-card-head">
                  <Icon name="grid" />
                  <strong>{t(plugin.nameKey)}</strong>
                </header>
                <p>{t(plugin.descKey)}</p>
                <Button variant={isInstalled ? "secondary" : "primary"} className={isInstalled ? "plugin-installed" : "plugin-install"} onClick={() => toggleInstall(plugin.id)}>
                  {isInstalled ? t("qoderInstalled") : t("qoderInstall")}
                </Button>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
}
