import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput, type SpeechInput } from "./useSpeechInput";

/** 假 SpeechRecognition：记录实例并暴露事件触发口（project-quest SPEC §5.8 单测要求） */
class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  lang = "";
  interimResults = false;
  continuous = false;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;
  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  abort() {
    this.aborted = true;
  }
}

function Harness({ locale, onInterim, onFinal, expose }: { locale: string; onInterim: (text: string) => void; onFinal: (text: string) => void; expose: (speech: SpeechInput) => void }) {
  expose(useSpeechInput({ locale, onInterim, onFinal }));
  return null;
}

describe("useSpeechInput", () => {
  let container: HTMLDivElement;
  let root: Root;
  let speech: SpeechInput;
  const onInterim = vi.fn();
  const onFinal = vi.fn();

  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    onInterim.mockClear();
    onFinal.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function render(locale = "en") {
    act(() => root.render(<Harness locale={locale} onInterim={onInterim} onFinal={onFinal} expose={(value) => { speech = value; }} />));
  }

  it("reports unsupported when no SpeechRecognition constructor exists", () => {
    render();
    expect(speech.supported).toBe(false);
    act(() => speech.start());
    expect(speech.status).toBe("idle");
  });

  it("maps zh locale to zh-CN dictation and routes interim/final segments", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);
    render("zh");
    expect(speech.supported).toBe(true);
    act(() => speech.start());
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("zh-CN");
    expect(recognition.interimResults).toBe(true);
    expect(recognition.started).toBe(true);
    expect(speech.status).toBe("listening");

    act(() => recognition.onresult!({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "帮我" } }] }));
    expect(onInterim).toHaveBeenLastCalledWith("帮我");
    act(() => recognition.onresult!({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "帮我写测试" } }] }));
    expect(onFinal).toHaveBeenCalledWith("帮我写测试");
    expect(onInterim).toHaveBeenLastCalledWith("");

    act(() => speech.stop());
    expect(recognition.aborted).toBe(true);
    expect(speech.status).toBe("idle");
  });

  it("enters permission-denied on not-allowed and clears the interim buffer", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);
    render();
    act(() => speech.start());
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("en-US");
    act(() => recognition.onerror!({ error: "not-allowed" }));
    expect(speech.status).toBe("permission-denied");
    expect(onInterim).toHaveBeenLastCalledWith("");
  });

  it("returns to idle when recognition ends on its own", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);
    render();
    act(() => speech.start());
    const recognition = FakeSpeechRecognition.instances[0];
    act(() => recognition.onend!());
    expect(speech.status).toBe("idle");
    act(() => speech.start());
    expect(FakeSpeechRecognition.instances.length).toBe(2);
  });
});
