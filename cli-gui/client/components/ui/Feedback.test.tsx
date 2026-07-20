import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import { FeedbackProvider, useFeedback } from "./Feedback";

function Trigger() {
  const feedback = useFeedback();
  return <button onClick={() => feedback.success({ title: "Saved", description: "The change is ready." })}>show</button>;
}

describe("FeedbackProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("renders a success toast and dismisses it", () => {
    vi.useFakeTimers();
    act(() => root.render(<I18nProvider><FeedbackProvider><Trigger /></FeedbackProvider></I18nProvider>));
    act(() => container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.querySelector(".feedback-notice.success")?.textContent).toContain("Saved");
    act(() => (document.body.querySelector(".feedback-close") as HTMLButtonElement).click());
    act(() => vi.advanceTimersByTime(200));
    expect(document.body.querySelector(".feedback-notice")).toBeNull();
  });

  it("deduplicates notices with the same key", () => {
    function DuplicateTrigger() {
      const feedback = useFeedback();
      return <button onClick={() => feedback.error({ title: "Failed", key: "same-error" })}>show</button>;
    }
    act(() => root.render(<I18nProvider><FeedbackProvider><DuplicateTrigger /></FeedbackProvider></I18nProvider>));
    act(() => container.querySelector("button")?.click());
    act(() => container.querySelector("button")?.click());
    expect(document.body.querySelectorAll(".feedback-notice")).toHaveLength(1);
  });
});
