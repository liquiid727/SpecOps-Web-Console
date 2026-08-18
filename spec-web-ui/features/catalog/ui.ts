export type DiscoverSectionToolTone = "default" | "accent" | "danger";

export function buildDiscoverSectionToolClassName(tone: DiscoverSectionToolTone = "default") {
  const base =
    "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition";

  switch (tone) {
    case "accent":
      return `control control-primary ${base}`;
    case "danger":
      return `control control-secondary ${base} text-rose-400 hover:border-rose-300/40`;
    case "default":
    default:
      return `control control-secondary ${base}`;
  }
}

export function getCatalogRowTagPreview(tags: string[], limit = 4) {
  return {
    visibleTags: tags.slice(0, limit),
    hiddenCount: Math.max(0, tags.length - limit)
  };
}
