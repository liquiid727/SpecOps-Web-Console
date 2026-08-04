import type { StructuredCardData } from "./types";
import { formatCardTime } from "./CardParser";

export function UserMessageCard({ card }: { card: StructuredCardData }) {
  return <article className="transcript-event user_message card-user-message" data-card-type="user-message">
    <pre className="transcript-plain">{card.content}</pre>
    <time className="user-message-time">{formatCardTime(card.timestamp)}</time>
  </article>;
}
