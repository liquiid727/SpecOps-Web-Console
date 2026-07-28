import { execFile } from "node:child_process";
import type { PromptEnhanceAction, PromptEnhanceResponse } from "../shared/api.js";
import type { CommandSpec } from "./ports.js";

/** 入参上限 32KiB / 出参截断上限 64KiB（project-quest SPEC §5.7） */
export const ENHANCE_INPUT_LIMIT = 32 * 1024;
export const ENHANCE_OUTPUT_LIMIT = 64 * 1024;
export const ENHANCE_DEFAULT_TIMEOUT_MS = 30_000;

/** 内置指令模板（locale 分 en/zh）；与用户原文以空行拼接后整体作为一次性 prompt */
const instructions: Record<"en" | "zh", Record<PromptEnhanceAction, string>> = {
  en: {
    polish: "Rewrite the following task prompt to be clear, specific and well-structured. Reply with the rewritten prompt only.",
    compress: "Compress the following prompt, keep all constraints. Reply with the compressed prompt only."
  },
  zh: {
    polish: "将下面的任务提示词改写得清晰、具体、结构良好。只回复改写后的提示词。",
    compress: "压缩下面的提示词，保留全部约束条件。只回复压缩后的结果。"
  }
};

export function enhanceInstruction(action: PromptEnhanceAction, locale: "en" | "zh"): string {
  return instructions[locale][action];
}

export function buildEnhancePrompt(action: PromptEnhanceAction, locale: "en" | "zh", content: string): string {
  return `${enhanceInstruction(action, locale)}\n\n${content}`;
}

/** 一次性调用失败分类：TIMEOUT = 30s 超时被杀；FAILED = 非 0 退出 / 空输出 / spawn 失败 */
export class EnhanceExecutionError extends Error {
  constructor(readonly code: "ENHANCE_TIMEOUT" | "ENHANCE_FAILED", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EnhanceExecutionError";
  }
}

/** spawn 一次性子进程（参数数组，禁 shell 拼接）；stdout trim 后按 64KiB 截断返回 */
export function runEnhance(spec: CommandSpec, options: { env?: Readonly<Record<string, string | undefined>>; timeoutMs?: number } = {}): Promise<PromptEnhanceResponse> {
  const timeoutMs = options.timeoutMs ?? ENHANCE_DEFAULT_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    execFile(spec.command, spec.args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, shell: false, env: { ...options.env, ...spec.env } as NodeJS.ProcessEnv }, (error, stdout) => {
      if (error) {
        // execFile 超时以 killed + 信号终止呈现（maxBuffer 溢出同样 killed，按消息区分）；其余（ENOENT/非 0 退出）归 FAILED
        const failure = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
        const timedOut = failure.killed === true && Boolean(failure.signal) && !String(failure.message).includes("maxBuffer");
        reject(new EnhanceExecutionError(timedOut ? "ENHANCE_TIMEOUT" : "ENHANCE_FAILED", timedOut ? "Enhancement timed out." : "Enhancement command failed.", { cause: error }));
        return;
      }
      const trimmed = String(stdout).trim();
      if (!trimmed) {
        reject(new EnhanceExecutionError("ENHANCE_FAILED", "Enhancement produced no output."));
        return;
      }
      const buffer = Buffer.from(trimmed, "utf8");
      const truncated = buffer.byteLength > ENHANCE_OUTPUT_LIMIT;
      resolve({ content: truncated ? buffer.subarray(0, ENHANCE_OUTPUT_LIMIT).toString("utf8") : trimmed, truncated });
    });
  });
}
