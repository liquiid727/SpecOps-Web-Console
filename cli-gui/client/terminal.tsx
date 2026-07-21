import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { openTerminalSubscription } from "./api";
import { toFeedbackError } from "./feedback-errors";
import { useI18n } from "./i18n";
import { useFeedback } from "./components/ui/Feedback";
import { useTheme } from "./theme";
import { getTerminalTheme } from "./terminal-theme";

interface TerminalViewProps {
  sessionId: string;
  onStatus: (status: string) => void;
}

export function TerminalView({ sessionId, onStatus }: TerminalViewProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const feedback = useFeedback();
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
    let transport: ReturnType<typeof openTerminalSubscription> | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;

    function resize() {
      fit.fit();
      transport?.resize(terminal.cols, terminal.rows);
    }

    function connect() {
      if (disposed) return;
      transport = openTerminalSubscription(sessionId, {
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
    const dataDisposable = terminal.onData((data) => transport?.sendInput(data));
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(elementRef.current);
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      transport?.close();
      terminal.dispose();
    };
  }, [feedback, onStatus, sessionId, t, theme]);

  return <div className="terminal-host" ref={elementRef} aria-label={t("interactiveTerminal")} />;
}
