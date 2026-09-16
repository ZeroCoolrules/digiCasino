/**
 * Application-level error carrying an HTTP status and a machine-readable error code.
 * Caught by the central error handler and serialized per the API convention:
 * { "error": { "message": string, "code": string } } (see SYSTEM_ARCHITECTURE.md).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
