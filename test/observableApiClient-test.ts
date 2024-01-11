import assert from "assert";
import {CliError} from "../src/error.js";
import {getObservableApiOrigin, getObservableUiOrigin} from "../src/observableApiClient.js";

describe("getObservableUiOrigin", () => {
  it("works", () => {
    assert.equal(
      String(getObservableUiOrigin({OBSERVABLE_ORIGIN: "https://example.com"})),
      String(new URL("https://example.com"))
    );
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableUiOrigin({OBSERVABLE_ORIGIN: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLE_ORIGIN environment variable: /});
    }
  });
});

describe("getObservableApiOrigin", () => {
  it("works", () => {
    assert.equal(
      String(getObservableApiOrigin({OBSERVABLE_API_ORIGIN: "https://example.com"})),
      String(new URL("https://example.com"))
    );
  });

  it("throws an appropriate error for malformed URLs", () => {
    try {
      getObservableApiOrigin({OBSERVABLE_API_ORIGIN: "bad url"});
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: /^Invalid OBSERVABLE_API_ORIGIN environment variable: /});
    }
  });

  it("prefers OBSERVABLE_API_ORIGIN", () => {
    assert.equal(
      String(
        getObservableApiOrigin({
          OBSERVABLE_API_ORIGIN: "https://api.example.com",
          OBSERVABLE_ORIGIN: "https://ui.example.com"
        })
      ),
      String(new URL("https://api.example.com"))
    );
  });

  it("falls back to OBSERVABLE_ORIGIN", () => {
    assert.equal(
      String(getObservableApiOrigin({OBSERVABLE_API_ORIGIN: "", OBSERVABLE_ORIGIN: "https://example.com"})),
      String(new URL("https://api.example.com"))
    );
  });
});
