import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { toFeedbackError } from "./feedback-errors";
import { useI18n } from "./i18n";
import { useFeedback } from "./components/ui/Feedback";
import { useTheme } from "./theme";
import { getTerminalTheme } from "./terminal-theme";
import { useClientRuntime } from "./runtime/client-runtime";

interface TerminalViewProps {
  sessionId: string;
  onStatus: (status: string) => void;
  /** dual-mode §9.2：隐藏时保持挂载不卸载 xterm，切回时 fit + resize + focus */
  hidden?: boolean;
  /** dual-mode §10：inputOwner !== "terminal" 时禁止键入 */
  inputEnabled?: boolean;
}

export function TerminalView({ sessionId, onStatus, hidden = false, inputEnabled = true }: TerminalViewProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: getTerminalTheme(theme)
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(elementRef.current);

    let disposed = false;
    let transport: ReturnType<typeof runtime.terminal.subscribe> | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let resizeTimer: number | undefined;

    function resize() {
      // dual-mode §17.2：resize 去抖 150ms 防 IPC 风暴
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fit.fit();
        transport?.resize(terminal.cols, terminal.rows);
      }, 150);
    }

    function connect() {
      if (disposed) return;
      transport = runtime.terminal.subscribe(sessionId, {
        onOpen: () => { retryAttempt = 0; resize(); },
        onOutput: (data) => terminal.write(data),
        onStatus: (status) => onStatus(status),
        onError: () => feedback.error(toFeedbackError(undefined, t, "terminalConnectionFailed", `terminal-connection:${sessionId}`)),
        onClose: () => {
          if (disposed) return;
          const delay = Math.min(5_000, 250 * 2 ** retryAttempt++);
          retryTimer = window.setTimeout(connect, delay);
        }
      });
    }

    fit.fit();
    connect();
    const dataDisposable = terminal.onData((data) => {
      if (inputEnabled) transport?.sendInput(data);
    });
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(elementRef.current);
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      transport?.close();
      terminal.dispose();
    };
  }, [feedback, onStatus, runtime.terminal, sessionId, t, theme, inputEnabled]);

  // dual-mode §9.4：hidden→visible 时同步尺寸并聚焦
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hidden && elementRef.current) {
      // 延迟一帧等 layout 完成后 fit
      const raf = requestAnimationFrame(() => {
        elementRef.current?.querySelector<HTMLElement>(".xterm")?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [hidden]);

  return <div ref={terminalContainerRef} className="terminal-host" style={hidden ? { visibility: "hidden", position: "absolute", pointerEvents: "none", width: "100%", height: "100%" } : undefined}><div ref={elementRef} className="terminal-host-inner" aria-label={t("interactiveTerminal")} style={{ width: "100%", height: "100%" }} /></div>;
}
