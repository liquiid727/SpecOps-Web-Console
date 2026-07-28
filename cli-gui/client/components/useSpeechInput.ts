import { useCallback, useEffect, useRef, useState } from "react";

/** Web Speech API 最小类型面（lib.dom 未内置 SpeechRecognition；project-quest SPEC §5.8） */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const candidates = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return candidates.SpeechRecognition ?? candidates.webkitSpeechRecognition;
}

export type SpeechInputStatus = "idle" | "listening" | "permission-denied";

export interface SpeechInputOptions {
  /** i18n 语言 → 听写 lang（zh → zh-CN，其余 en-US） */
  locale: string;
  /** interim 段（灰显回填，不落定）；每次识别帧全量传当前 interim 拼接 */
  onInterim: (text: string) => void;
  /** final 段落定：调用方追加进 content（光标位置由调用方决定） */
  onFinal: (text: string) => void;
}

export interface SpeechInput {
  supported: boolean;
  status: SpeechInputStatus;
  start: () => void;
  stop: () => void;
}

/** Web Speech API 听写 hook（project-quest SPEC §5.8）：不支持时 supported=false，按钮保留降级 toast */
export function useSpeechInput({ locale, onInterim, onFinal }: SpeechInputOptions): SpeechInput {
  const supported = Boolean(speechRecognitionConstructor());
  const [status, setStatus] = useState<SpeechInputStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbacksRef = useRef({ onInterim, onFinal });
  callbacksRef.current = { onInterim, onFinal };

  const stop = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStatus((value) => (value === "listening" ? "idle" : value));
  }, []);

  const start = useCallback(() => {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition || recognitionRef.current) return;
    const recognition = new Recognition();
    recognition.lang = locale === "zh" ? "zh-CN" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) callbacksRef.current.onFinal(result[0].transcript);
        else interim += result[0].transcript;
      }
      callbacksRef.current.onInterim(interim);
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      callbacksRef.current.onInterim("");
      // 权限拒绝进入恢复指引态（composer 弹恢复指引 toast）；其余错误静默回 idle
      setStatus(event.error === "not-allowed" || event.error === "service-not-allowed" ? "permission-denied" : "idle");
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      callbacksRef.current.onInterim("");
      setStatus((value) => (value === "listening" ? "idle" : value));
    };
    recognitionRef.current = recognition;
    setStatus("listening");
    recognition.start();
  }, [locale]);

  // 组件卸载：中止听写，丢弃残余 interim
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, status, start, stop };
}
