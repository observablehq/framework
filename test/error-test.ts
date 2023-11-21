import assert from "node:assert";
import {HttpError, isEnoent, isHttpError, isSystemError} from "../src/error.js";

describe("new HttpError(message, status, options?)", () => {
  it("returns an error with the given message and status", () => {
    const error = new HttpError("not found", 404);
    assert.ok(error instanceof HttpError);
    assert.strictEqual(error.message, "not found");
    assert.strictEqual(error.statusCode, 404);
    assert.strictEqual(isHttpError(error), true);
  });
  it("returns an error with the given cause", () => {
    const error = new HttpError("not found", 404, {cause: "fate"});
    assert.strictEqual(error.cause, "fate");
  });
});

describe("isHttpError(error)", () => {
  it("returns false for non-errors", () => {
    assert.strictEqual(isHttpError(null), false);
    assert.strictEqual(isHttpError(undefined), false);
    assert.strictEqual(isHttpError(42), false);
    assert.strictEqual(isHttpError({}), false);
    assert.strictEqual(isHttpError(Symbol("foo")), false);
  });
  it("returns false for errors without statusCode", () => {
    assert.strictEqual(isHttpError(new Error()), false);
  });
  it("returns true for errors with statusCode", () => {
    assert.strictEqual(isHttpError(Object.assign(new Error(), {statusCode: null})), true);
    assert.strictEqual(isHttpError(Object.assign(new Error(), {statusCode: 200})), true);
    assert.strictEqual(isHttpError(Object.assign(new Error(), {statusCode: 404})), true);
  });
});

describe("isSystemError(error)", () => {
  it("returns false for non-errors", () => {
    assert.strictEqual(isSystemError(null), false);
    assert.strictEqual(isSystemError(undefined), false);
    assert.strictEqual(isSystemError(42), false);
    assert.strictEqual(isSystemError({}), false);
    assert.strictEqual(isSystemError(Symbol("foo")), false);
  });
  it("returns false for errors without code", () => {
    assert.strictEqual(isSystemError(new Error()), false);
  });
  it("returns true for errors with code", () => {
    assert.strictEqual(isSystemError(Object.assign(new Error(), {code: null})), true);
    assert.strictEqual(isSystemError(Object.assign(new Error(), {code: "ECONNREFUSED"})), true);
    assert.strictEqual(isSystemError(Object.assign(new Error(), {code: "ENOENT"})), true);
  });
});

describe("isEnoent(error)", () => {
  it("returns false for non-errors", () => {
    assert.strictEqual(isEnoent(null), false);
    assert.strictEqual(isEnoent(undefined), false);
    assert.strictEqual(isEnoent(42), false);
    assert.strictEqual(isEnoent({}), false);
    assert.strictEqual(isEnoent(Symbol("foo")), false);
  });
  it("returns false for non-ENOENT errors", () => {
    assert.strictEqual(isEnoent(new Error()), false);
    assert.strictEqual(isEnoent(Object.assign(new Error(), {code: null})), false);
    assert.strictEqual(isEnoent(Object.assign(new Error(), {code: "ECONNREFUSED"})), false);
  });
  it("returns true for errors with ENOENT code", () => {
    assert.strictEqual(isEnoent(Object.assign(new Error(), {code: "ENOENT"})), true);
  });
});
