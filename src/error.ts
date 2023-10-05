export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, cause?: Error) {
    super(message ?? `HTTP status ${statusCode}`, cause);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, HttpError);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNodeError(error: any): error is NodeJS.ErrnoException {
  return error instanceof Error && "errno" in error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isHttpError(error: any): error is HttpError {
  return error instanceof Error && "statusCode" in error;
}
