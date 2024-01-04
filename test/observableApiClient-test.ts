import assert from "assert";
import {CliError} from "../src/error.js";
import {getObservableApiHost, getObservableUiHost} from "../src/observableApiClient.js";

describe("getObservableUiHost", () => {
  it("works", () => {
    assert.deepEqual(getObservableUiHost({OBSERVABLEHQ_HOST: "https://example.com"}), new URL("https://example.com"));
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableUiHost({OBSERVABLEHQ_HOST: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLEHQ_HOST environment variable: /});
    }
  });
});

describe("getObservableApiHost", () => {
  it("works", () => {
    assert.deepEqual(
      getObservableApiHost({OBSERVABLEHQ_API_HOST: "https://example.com"}),
      new URL("https://example.com")
    );
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableApiHost({OBSERVABLEHQ_API_HOST: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLEHQ_API_HOST environment variable: /});
    }
  });

  it("prefers OBSERVABLEHQ_API_HOST", () => {
    assert.deepEqual(
      getObservableApiHost({
        OBSERVABLEHQ_API_HOST: "https://example.com/api",
        OBSERVABLEHQ_HOST: "https://example.com/ui"
      }),
      new URL("https://example.com/api")
    );
  });

  it("falls back to OBSERVABLEHQ_HOST", () => {
    assert.deepEqual(
      getObservableApiHost({OBSERVABLEHQ_API_HOST: "https://example.com/api"}),
      new URL("https://example.com/ui")
    );
  });
});
