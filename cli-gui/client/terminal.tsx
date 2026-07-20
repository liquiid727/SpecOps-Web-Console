import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { openTerminalSubscription } from "./api";

interface TerminalViewProps {
  sessionId: string;
  onStatus: (status: string) => void;
}

export function TerminalView({ sessionId, onStatus }: TerminalViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: {
        background: "#101011",
        foreground: "#d7d5d0",
        cursor: "#e68766",
        cursorAccent: "#101011",
        selectionBackground: "#45434a",
        black: "#151516",
        brightBlack: "#77746e",
        red: "#e06972",
        brightRed: "#ef8d94",
        green: "#6cc49a",
        brightGreen: "#8dd4b0",
        yellow: "#d9b56f",
        brightYellow: "#e9ca8e",
        blue: "#79a8d8",
        brightBlue: "#9bc0e5",
        magenta: "#b99ad8",
        brightMagenta: "#cdb2e5",
        cyan: "#74bfc5",
        brightCyan: "#98d2d6",
        white: "#d7d5d0",
        brightWhite: "#f0efec"
      }
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
        onError: (message) => terminal.writeln(`\r\n[error] ${message}`),
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
  }, [onStatus, sessionId]);

  return <div className="terminal-host" ref={elementRef} aria-label="Interactive terminal" />;
}
