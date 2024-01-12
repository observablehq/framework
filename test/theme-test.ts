import assert from "node:assert";
import {renderTheme, resolveTheme} from "../src/theme.js";

describe("resolveTheme", () => {
  it("resolves the empty theme", () => {
    assert.deepStrictEqual(resolveTheme([]), ["air", "near-midnight"]);
  });
  it("resolves the default theme", () => {
    assert.deepStrictEqual(resolveTheme(["default"]), ["air", "near-midnight"]);
  });
  it("combines the default theme with a preceding light theme", () => {
    assert.deepStrictEqual(resolveTheme(["glacier", "default"]), ["glacier", "near-midnight"]);
  });
  it("combines the default theme with a preceding dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["ink", "default"]), ["air", "ink"]);
  });
  it("combines the default theme with a following light theme", () => {
    assert.deepStrictEqual(resolveTheme(["default", "glacier"]), ["glacier", "near-midnight"]);
  });
  it("combines the default theme with a following dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["default", "ink"]), ["air", "ink"]);
  });
  it("renders the alt theme", () => {
    assert.deepStrictEqual(resolveTheme(["alt"]), ["air", "near-midnight", "alt"]);
  });
  it("renders the wide theme", () => {
    assert.deepStrictEqual(resolveTheme(["wide"]), ["air", "near-midnight", "wide"]);
  });
  it("renders the dashboard theme as shorthand for [alt, wide]", () => {
    assert.deepStrictEqual(resolveTheme(["dashboard"]), ["air", "near-midnight", "alt", "wide"]);
  });
  it("combines the dashboard theme with a preceding light theme", () => {
    assert.deepStrictEqual(resolveTheme(["dashboard", "air"]), ["air", "alt", "wide"]);
  });
  it("combines the dashboard theme with a preceding dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["dashboard", "ink"]), ["ink", "alt", "wide"]);
  });
  it("combines the dashboard theme with a following light theme", () => {
    assert.deepStrictEqual(resolveTheme(["dashboard", "air"]), ["air", "alt", "wide"]);
  });
  it("combines the dashboard theme with a following dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["dashboard", "ink"]), ["ink", "alt", "wide"]);
  });
  it("combines the dashboard theme with a preceding light and dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["cotton", "slate", "dashboard"]), ["cotton", "slate", "alt", "wide"]);
  });
  it("combines the dashboard theme with a preceding default and dark theme", () => {
    assert.deepStrictEqual(resolveTheme(["default", "slate", "dashboard"]), ["air", "slate", "alt", "wide"]);
  });
  it("combines the dashboard theme with a preceding light and default theme", () => {
    assert.deepStrictEqual(resolveTheme(["cotton", "default", "dashboard"]), ["cotton", "near-midnight", "alt", "wide"]); // prettier-ignore
  });
});

describe("renderTheme", () => {
  it("renders the empty theme", () => {
    assert.strictEqual(renderTheme([]), '@import url("observablehq:default.css");');
  });
  it("renders a light theme", () => {
    assert.strictEqual(
      renderTheme(["air"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");`
    );
  });
  it("renders a dark theme", () => {
    assert.strictEqual(
      renderTheme(["near-midnight"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-near-midnight.css");`
    );
  });
  it("renders a light and dark theme", () => {
    assert.strictEqual(
      renderTheme(["air", "near-midnight"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css") (prefers-color-scheme: light);
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);`
    );
  });
  it("renders an alt theme", () => {
    assert.strictEqual(
      renderTheme(["air", "alt"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");
@import url("observablehq:theme-alt.css");`
    );
  });
  it("renders an wide theme", () => {
    assert.strictEqual(
      renderTheme(["air", "wide"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");
@import url("observablehq:theme-wide.css");`
    );
  });
  it("renders an alt-wide theme", () => {
    assert.strictEqual(
      renderTheme(["air", "alt", "wide"]),
      `@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");
@import url("observablehq:theme-alt.css");
@import url("observablehq:theme-wide.css");`
    );
  });
});
