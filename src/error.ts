import assert from "node:assert";

interface HttpErrorOptions extends ErrorOptions {
  details?: unknown;
}

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, options?: HttpErrorOptions) {
    const {details, ...errorOptions} = options ?? {};
    super(message, errorOptions);
    this.statusCode = statusCode;
    this.details = details;
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

export function isApiError(error: unknown): error is HttpError & {details: {errors: {code: string}[]}} {
  return (
    isHttpError(error) &&
    !!error.details &&
    typeof error.details === "object" &&
    "errors" in error.details &&
    Array.isArray(error.details.errors) &&
    error.details.errors.every((e) => typeof e === "object" && "code" in e)
  );
}

/** Throw this to indicate the CLI should exit with a non-zero exit code. */
export class CliError extends Error {
  public readonly exitCode: number;
  public readonly print: boolean;

  constructor(
    message: string,
    {exitCode = 1, print = true, ...options}: ErrorOptions & {exitCode?: number; print?: boolean} = {}
  ) {
    super(message, options);
    this.exitCode = exitCode;
    this.print = print;
  }

  /** Use in tests to check if a thrown error is the error you expected. */
  static assert(
    error: unknown,
    {message, exitCode = 1, print = true}: {message?: RegExp | string; exitCode?: number; print?: boolean} = {}
  ): asserts error is CliError {
    assert.ok(error instanceof Error, `Expected error to be an Error but got ${error}`);
    assert.ok(error instanceof CliError, `Expected error to be a CliError but got ${error.message}\n${error.stack}`);
    if (typeof message === "string") {
      assert.equal(error.message, message);
    } else if (message instanceof RegExp) {
      assert.ok(
        message.test(error.message),
        `Expected error message to match regexp ${message.toString()} but got ${error.message}`
      );
    }
    assert.equal(error.exitCode, exitCode, `Expected exit code to be ${exitCode}, but got ${error.exitCode}`);
    assert.equal(error.print, print, `Expected print to be ${print}, but got ${error.print}`);
  }
}
