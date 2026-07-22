import { useEffect, useRef, useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { api } from "../api";
import { useI18n } from "../i18n";
import { PromptComposer } from "./PromptComposer";
import { Icon } from "./ui/Icon";

interface ChatViewProps {
  session: Session;
  workspace?: Workspace;
  onSend: (content: string) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export function ChatView({ session, onSend }: ChatViewProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load transcript for this session
    let cancelled = false;
    async function loadTranscript() {
      try {
        const result = await api.transcript(session.id, 0, 200);
        if (!cancelled && result.events) {
          const msgs: Message[] = result.events
            .filter((e) => e.type === "client-message" || e.type === "assistant-message")
            .map((e) => ({
              id: e.sequence?.toString() ?? Math.random().toString(),
              role: e.type === "client-message" ? "user" : "assistant",
              content: e.payload?.content ?? "",
              timestamp: e.timestamp ?? new Date().toISOString(),
            }));
          setMessages(msgs);
        }
      } catch {
        // Session may not have transcript yet
      }
    }
    void loadTranscript();
    return () => { cancelled = true; };
  }, [session.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>{session.name}</h2>
        <span className={`chat-status ${session.runtimeStatus ?? session.status ?? "stopped"}`}>
          {session.runtimeStatus ?? session.status ?? "stopped"}
        </span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="message" />
            <p>{t("qoderNoMessages")}</p>
            <p className="chat-empty-hint">{t("qoderStartConversation")}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="message-bubble">
                <p>{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-composer">
        <PromptComposer
          disabled={loading}
          onSend={async (content) => {
            onSend(content);
          }}
        />
      </div>
    </div>
  );
}
