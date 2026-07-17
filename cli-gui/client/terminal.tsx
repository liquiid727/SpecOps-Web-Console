import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

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
    fit.fit();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}`);
    socket.addEventListener("open", () => {
      fit.fit();
      socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as { type: string; data?: string; status?: string; message?: string };
      if (message.type === "output" && message.data) terminal.write(message.data);
      if (message.type === "status" && message.status) onStatus(message.status);
      if (message.type === "error" && message.message) terminal.writeln(`\r\n[error] ${message.message}`);
    });
    terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data }));
    });
    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    });
    resizeObserver.observe(elementRef.current);
    return () => {
      resizeObserver.disconnect();
      socket.close();
      terminal.dispose();
    };
  }, [sessionId, onStatus]);

  return <div className="terminal-host" ref={elementRef} aria-label="Interactive terminal" />;
}
