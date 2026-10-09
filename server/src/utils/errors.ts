/**
 * Errors the API turns into HTTP responses (see middleware/errorHandler.ts).
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    status = 400,
    code = "bad_request",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "not_found");
    this.name = "NotFoundError";
  }
}
