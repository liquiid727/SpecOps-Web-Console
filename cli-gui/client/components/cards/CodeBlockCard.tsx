import { useI18n } from "../../i18n";
import { useClientRuntime } from "../../runtime/client-runtime";
import { Button } from "../ui";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function CodeBlockCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const language = typeof card.metadata?.language === "string" && card.metadata.language ? card.metadata.language : t("codeBlock");
  return <article className="transcript-event card-code-block" data-card-type="code-block">
    <header>
      <span className="card-badge">{language}</span>
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    <pre className="card-command-text"><code>{card.content}</code></pre>
    <Button variant="ghost" className="copy-button" onClick={() => void runtime.platform.copyText(card.content)}>{t("copy")}</Button>
  </article>;
}
