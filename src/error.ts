export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, options?: ErrorOptions) {
    super(message, options);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, HttpError);
  }
}

export function isEnoent(error: unknown): error is NodeJS.ErrnoException {
  return isSystemError(error) && error.code === "ENOENT";
}

export function isSystemError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && "statusCode" in error;
}
