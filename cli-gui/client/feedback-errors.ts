import { ApiClientError } from "./api";
import type { ApiErrorCode } from "../shared/api";
import type { TranslationKey } from "./i18n";
import type { FeedbackOptions } from "./components/ui/Feedback";

const errorMessageKeys: Partial<Record<ApiErrorCode, TranslationKey>> = {
  VALIDATION_FAILED: "operationFailed",
  READONLY_MODE: "readonlyOperationFailed",
  WORKSPACE_NOT_FOUND: "workspaceNotFound",
  WORKSPACE_PATH_INVALID: "workspacePathInvalid",
  WORKSPACE_DUPLICATE: "workspaceAlreadyRegistered",
  WORKSPACE_IN_USE: "workspaceInUse",
  PROFILE_NOT_FOUND: "profileNotFound",
  PROFILE_IN_USE: "profileInUse",
  CLI_OPTION_UNSUPPORTED: "cliOptionUnsupported",
  SESSION_NOT_FOUND: "sessionNotFound",
  SESSION_REVISION_CONFLICT: "sessionConflict",
  SESSION_NOT_ACTIVE: "sessionNotActive",
  SESSION_RUNNING_CONFIRMATION_REQUIRED: "sessionConfirmationRequired",
  SESSION_ALREADY_RUNNING: "sessionAlreadyRunning",
  SESSION_START_FAILED: "sessionStartFailed",
  SESSION_CONCURRENCY_LIMIT: "sessionConcurrencyLimit",
  SESSION_HAS_FORKS: "sessionHasForks",
  MESSAGE_DUPLICATE: "messageAlreadySent",
  MESSAGE_DELIVERY_FAILED: "messageDeliveryFailed",
  TRANSCRIPT_CORRUPT: "transcriptFailed",
  TRANSCRIPT_WRITE_FAILED: "recordingWarning",
  PICKER_UNAVAILABLE: "pickerUnavailable",
  PICKER_BUSY: "pickerBusy",
  PICKER_TIMEOUT: "pickerTimeout",
  PICKER_INTENT_INVALID: "pickerIntentInvalid",
  FILE_NOT_FOUND: "fileNotFound",
  FILE_BINARY: "binaryFile",
  GIT_UNAVAILABLE: "gitUnavailable",
  NOT_A_GIT_REPOSITORY: "notGitRepository",
  GIT_TIMEOUT: "gitTimeout",
  INTERNAL_ERROR: "operationFailed"
};

export function toFeedbackError(cause: unknown, t: (key: TranslationKey, params?: Record<string, string | number | undefined>) => string, fallback: TranslationKey = "operationFailed", key?: string): FeedbackOptions {
  const apiError = cause instanceof ApiClientError ? cause : undefined;
  const messageKey = apiError ? errorMessageKeys[apiError.code] ?? fallback : fallback;
  const reference = apiError && apiError.requestId !== "unknown" ? ` ${t("requestReference", { id: apiError.requestId })}` : "";
  // 服务端 details（如 SESSION_CONCURRENCY_LIMIT 的 running/limit）作为文案插值参数（frontend-spec §6）
  const params = apiError?.details ? Object.fromEntries(Object.entries(apiError.details).filter(([, value]) => typeof value === "string" || typeof value === "number") as [string, string | number][]) : undefined;
  return {
    title: t("error"),
    description: `${t(messageKey, params)}${reference}`,
    duration: 0,
    key: key ?? (apiError ? `api-error:${apiError.code}` : undefined)
  };
}

export function toFeedbackWarning(cause: unknown, t: (key: TranslationKey, params?: Record<string, string | number | undefined>) => string, fallback: TranslationKey = "operationFailed", key?: string): FeedbackOptions {
  const apiError = cause instanceof ApiClientError ? cause : undefined;
  const messageKey = apiError ? errorMessageKeys[apiError.code] ?? fallback : fallback;
  return {
    title: t("warning"),
    description: t(messageKey),
    key: key ?? (apiError ? `api-warning:${apiError.code}` : undefined)
  };
}
