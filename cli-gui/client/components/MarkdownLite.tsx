import { useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "../i18n";
import { useClientRuntime } from "../runtime/client-runtime";
import { Button } from "./ui";

const MAX_MARKDOWN_BYTES = 256 * 1024;

export function MarkdownLite({ source, truncated = false }: { source: string; truncated?: boolean }) {
  const { t } = useI18n();
  const bytes = new TextEncoder().encode(source);
  const bounded = bytes.length > MAX_MARKDOWN_BYTES;
  const rendered = new TextDecoder().decode(bytes.subarray(0, MAX_MARKDOWN_BYTES));
  return <div className="markdown-lite">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeUrl} components={{
      a: ({ href, children, ...props }) => <a {...props} href={safeUrl(href) || "#"} target={isExternalUrl(href) ? "_blank" : undefined} rel={isExternalUrl(href) ? "noreferrer noopener" : undefined}>{children}</a>,
      img: ({ src, alt }) => {
        const href = safeUrl(typeof src === "string" ? src : undefined);
        const label = alt || (typeof src === "string" ? src : "");
        return href && isExternalUrl(href)
          ? <a className="markdown-image-link" href={href} target="_blank" rel="noreferrer noopener">{label}</a>
          : <span className="markdown-image-link">{label}</span>;
      },
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>
    }}>{rendered}</ReactMarkdown>
    {(bounded || truncated) && <p className="markdown-truncated">{t("truncatedMessage")}</p>}
  </div>;
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const preRef = useRef<HTMLPreElement | null>(null);
  return <div className="markdown-code-block">
    <Button variant="ghost" className="copy-button code-copy" onClick={() => void runtime.platform.copyText(preRef.current?.textContent ?? "")}>{t("copy")}</Button>
    <pre ref={preRef}>{children}</pre>
  </div>;
}

function safeUrl(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("//")) return "";
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  try {
    const parsed = new URL(value, "https://local.invalid");
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? value : "";
  } catch {
    return "";
  }
}

function isExternalUrl(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}
