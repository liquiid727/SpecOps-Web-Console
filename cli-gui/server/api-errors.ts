import type http from "node:http";
import type { ApiErrorCode, ApiErrorResponse } from "../shared/api.js";

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly publicMessage: string,
    readonly details?: Record<string, unknown>,
    options?: ErrorOptions
  ) {
    super(publicMessage, options);
    this.name = "ApiHttpError";
  }
}

export function validationError(message: string, details?: Record<string, unknown>) {
  return new ApiHttpError(400, "VALIDATION_FAILED", message, details);
}

export function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  response.setHeader("cache-control", "no-store");
  if (status === 204) {
    response.writeHead(status);
    response.end();
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

export function toApiError(error: unknown, requestId: string): { status: number; response: ApiErrorResponse; cause: unknown } {
  if (error instanceof ApiHttpError) {
    return {
      status: error.status,
      response: { error: { code: error.code, message: error.publicMessage, details: error.details, requestId } },
      cause: error.cause ?? error
    };
  }
  return {
    status: 500,
    response: { error: { code: "INTERNAL_ERROR", message: "Operation failed; see local logs.", requestId } },
    cause: error
  };
}
