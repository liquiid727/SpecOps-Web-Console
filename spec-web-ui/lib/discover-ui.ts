export type DiscoverSectionToolTone = "default" | "accent" | "danger";

export function buildDiscoverSectionToolClassName(tone: DiscoverSectionToolTone = "default") {
  const base =
    "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition hover:bg-sand";

  switch (tone) {
    case "accent":
      return `${base} border-accent/50 bg-accent/10 text-accent-strong hover:bg-accent/15`;
    case "danger":
      return `${base} border-line/60 text-rose-300`;
    case "default":
    default:
      return `${base} border-line/60 text-slate-500`;
  }
}

export function getCatalogRowTagPreview(tags: string[], limit = 4) {
  return {
    visibleTags: tags.slice(0, limit),
    hiddenCount: Math.max(0, tags.length - limit)
  };
}
