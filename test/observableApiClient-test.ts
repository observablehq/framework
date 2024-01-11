import assert from "assert";
import {CliError} from "../src/error.js";
import {getObservableApiHost, getObservableUiHost} from "../src/observableApiClient.js";

describe("getObservableUiHost", () => {
  it("works", () => {
    assert.deepEqual(getObservableUiHost({OBSERVABLE_HOST: "https://example.com"}), new URL("https://example.com"));
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableUiHost({OBSERVABLE_HOST: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLE_HOST environment variable: /});
    }
  });
});

describe("getObservableApiHost", () => {
  it("works", () => {
    assert.deepEqual(
      getObservableApiHost({OBSERVABLE_API_HOST: "https://example.com"}),
      new URL("https://example.com")
    );
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableApiHost({OBSERVABLE_API_HOST: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLE_API_HOST environment variable: /});
    }
  });

  it("prefers OBSERVABLE_API_HOST", () => {
    assert.deepEqual(
      getObservableApiHost({
        OBSERVABLE_API_HOST: "https://example.com/api",
        OBSERVABLE_HOST: "https://example.com/ui"
      }),
      new URL("https://example.com/api")
    );
  });

  it("falls back to OBSERVABLE_HOST", () => {
    assert.deepEqual(
      getObservableApiHost({OBSERVABLE_API_HOST: "https://example.com/api"}),
      new URL("https://example.com/ui")
    );
  });
});
