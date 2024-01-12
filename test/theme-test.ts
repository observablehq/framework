import assert from "node:assert";
import {renderTheme} from "../src/theme.js";

describe("renderTheme", () => {
  it("renders the empty theme", () => {
    assert.strictEqual(
      renderTheme([]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("renders the default theme", () => {
    assert.strictEqual(
      renderTheme(["default"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("combines the default theme with a preceding light theme", () => {
    assert.strictEqual(
      renderTheme(["glacier", "default"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-glacier.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("combines the default theme with a preceding dark theme", () => {
    assert.strictEqual(
      renderTheme(["ink", "default"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-ink.css") (prefers-color-scheme: dark);
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);`
    );
  });
  it("combines the default theme with a following light theme", () => {
    assert.strictEqual(
      renderTheme(["default", "glacier"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);
@import url("observablehq:theme-glacier.css") (prefers-color-scheme: light);`
    );
  });
  it("combines the default theme with a following dark theme", () => {
    assert.strictEqual(
      renderTheme(["default", "ink"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-ink.css") (prefers-color-scheme: dark);`
    );
  });
  it("renders the alt theme", () => {
    assert.strictEqual(
      renderTheme(["alt"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("renders the wide theme", () => {
    assert.strictEqual(
      renderTheme(["wide"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("renders the dashboard theme as shorthand for [alt, wide]", () => {
    assert.strictEqual(
      renderTheme(["dashboard"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("combines the dashboard theme with a preceding light theme", () => {
    assert.strictEqual(
      renderTheme(["dashboard", "air"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-air.css");`
    );
  });
  it("combines the dashboard theme with a preceding dark theme", () => {
    assert.strictEqual(
      renderTheme(["dashboard", "ink"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-ink.css");`
    );
  });
  it("combines the dashboard theme with a following light theme", () => {
    assert.strictEqual(
      renderTheme(["dashboard", "air"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-air.css");`
    );
  });
  it("combines the dashboard theme with a following dark theme", () => {
    assert.strictEqual(
      renderTheme(["dashboard", "ink"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");
@import url("observablehq:theme-ink.css");`
    );
  });
  it("combines the dashboard theme with a preceding light and dark theme", () => {
    assert.strictEqual(
      renderTheme(["cotton", "slate", "dashboard"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-cotton.css") (prefers-color-scheme: light);
@import url("observablehq:theme-slate.css") (prefers-color-scheme: dark);
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");`
    );
  });
  it("combines the dashboard theme with a preceding default and dark theme", () => {
    assert.strictEqual(
      renderTheme(["default", "slate", "dashboard"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-slate.css") (prefers-color-scheme: dark);
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");`
    );
  });
  it("combines the dashboard theme with a preceding light and default theme", () => {
    assert.strictEqual(
      renderTheme(["cotton", "default", "dashboard"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-cotton.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");`
    );
  });
});
