import assert from "node:assert";
import {convertNode, convertNodes, inferFileName, resolveInput} from "../src/convert.js";

describe("convertNodes", () => {
  it("converts multiple nodes", () => {
    assert.strictEqual(
      convertNodes([
        {mode: "md", value: "Hello, world!"},
        {mode: "js", value: "1 + 2"}
      ]),
      "Hello, world!\n\n```js\n1 + 2\n```\n"
    );
  });
});

describe("convertNode", () => {
  it("passes through Markdown, adding a newline", () => {
    assert.strictEqual(convertNode({mode: "md", value: "Hello, world!"}), "Hello, world!\n");
    assert.strictEqual(convertNode({mode: "md", value: "# Hello, world!"}), "# Hello, world!\n");
    assert.strictEqual(convertNode({mode: "md", value: "# Hello, ${'world'}!"}), "# Hello, ${'world'}!\n");
  });
  it("wraps JavaScript in a fenced code block", () => {
    assert.strictEqual(convertNode({mode: "js", value: "1 + 2"}), "```js\n1 + 2\n```\n");
  });
  it("converts pinned to echo", () => {
    assert.strictEqual(convertNode({mode: "js", pinned: true, value: "1 + 2"}), "```js echo\n1 + 2\n```\n");
  });
});

describe("inferFileName", () => {
  it("infers a suitable file name based on identifier", () => {
    assert.strictEqual(inferFileName("https://api.observablehq.com/document/1111111111111111"), "1111111111111111.md");
  });
  it("infers a suitable file name based on slug", () => {
    assert.strictEqual(inferFileName("https://api.observablehq.com/document/@d3/bar-chart"), "bar-chart.md");
  });
  it("handles a slug with a suffix", () => {
    assert.strictEqual(inferFileName("https://api.observablehq.com/document/@d3/bar-chart/2"), "bar-chart,2.md");
  });
  it("handles a different origin", () => {
    assert.strictEqual(inferFileName("https://api.example.com/document/@d3/bar-chart"), "bar-chart.md");
  });
});

/* prettier-ignore */
describe("resolveInput", () => {
  it("resolves document identifiers", () => {
    assert.strictEqual(resolveInput("1111111111111111"), "https://api.observablehq.com/document/1111111111111111");
    assert.strictEqual(resolveInput("1234567890abcdef"), "https://api.observablehq.com/document/1234567890abcdef");
  });
  it("resolves document slugs", () => {
    assert.strictEqual(resolveInput("@d3/bar-chart"), "https://api.observablehq.com/document/@d3/bar-chart");
    assert.strictEqual(resolveInput("@d3/bar-chart/2"), "https://api.observablehq.com/document/@d3/bar-chart/2");
  });
  it("resolves document versions", () => {
    assert.strictEqual(resolveInput("1234567890abcdef@123"), "https://api.observablehq.com/document/1234567890abcdef@123");
    assert.strictEqual(resolveInput("1234567890abcdef@latest"), "https://api.observablehq.com/document/1234567890abcdef@latest");
    assert.strictEqual(resolveInput("1234567890abcdef~0"), "https://api.observablehq.com/document/1234567890abcdef~0");
    assert.strictEqual(resolveInput("@d3/bar-chart@123"), "https://api.observablehq.com/document/@d3/bar-chart@123");
    assert.strictEqual(resolveInput("@d3/bar-chart@latest"), "https://api.observablehq.com/document/@d3/bar-chart@latest");
    assert.strictEqual(resolveInput("@d3/bar-chart~0"), "https://api.observablehq.com/document/@d3/bar-chart~0");
    assert.strictEqual(resolveInput("@d3/bar-chart/2@123"), "https://api.observablehq.com/document/@d3/bar-chart/2@123");
    assert.strictEqual(resolveInput("@d3/bar-chart/2@latest"), "https://api.observablehq.com/document/@d3/bar-chart/2@latest");
    assert.strictEqual(resolveInput("@d3/bar-chart/2~0"), "https://api.observablehq.com/document/@d3/bar-chart/2~0");
  });
  it("resolves urls", () => {
    assert.strictEqual(resolveInput("https://observablehq.com/1234567890abcdef"), "https://api.observablehq.com/document/1234567890abcdef");
    assert.strictEqual(resolveInput("https://observablehq.com/1234567890abcdef@123"), "https://api.observablehq.com/document/1234567890abcdef@123");
    assert.strictEqual(resolveInput("https://observablehq.com/1234567890abcdef@latest"), "https://api.observablehq.com/document/1234567890abcdef@latest");
    assert.strictEqual(resolveInput("https://observablehq.com/1234567890abcdef~0"), "https://api.observablehq.com/document/1234567890abcdef~0");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart"), "https://api.observablehq.com/document/@d3/bar-chart");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart@123"), "https://api.observablehq.com/document/@d3/bar-chart@123");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart@latest"), "https://api.observablehq.com/document/@d3/bar-chart@latest");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart~0"), "https://api.observablehq.com/document/@d3/bar-chart~0");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart/2"), "https://api.observablehq.com/document/@d3/bar-chart/2");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart/2@123"), "https://api.observablehq.com/document/@d3/bar-chart/2@123");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart/2@latest"), "https://api.observablehq.com/document/@d3/bar-chart/2@latest");
    assert.strictEqual(resolveInput("https://observablehq.com/@d3/bar-chart/2~0"), "https://api.observablehq.com/document/@d3/bar-chart/2~0");
  });
  it("preserves the specified host", () => {
    assert.strictEqual(resolveInput("https://example.com/1234567890abcdef"), "https://api.example.com/document/1234567890abcdef");
    assert.strictEqual(resolveInput("https://example.com/1234567890abcdef@123"), "https://api.example.com/document/1234567890abcdef@123");
    assert.strictEqual(resolveInput("https://example.com/1234567890abcdef@latest"), "https://api.example.com/document/1234567890abcdef@latest");
    assert.strictEqual(resolveInput("https://example.com/1234567890abcdef~0"), "https://api.example.com/document/1234567890abcdef~0");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart"), "https://api.example.com/document/@d3/bar-chart");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart@123"), "https://api.example.com/document/@d3/bar-chart@123");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart@latest"), "https://api.example.com/document/@d3/bar-chart@latest");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart~0"), "https://api.example.com/document/@d3/bar-chart~0");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart/2"), "https://api.example.com/document/@d3/bar-chart/2");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart/2@123"), "https://api.example.com/document/@d3/bar-chart/2@123");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart/2@latest"), "https://api.example.com/document/@d3/bar-chart/2@latest");
    assert.strictEqual(resolveInput("https://example.com/@d3/bar-chart/2~0"), "https://api.example.com/document/@d3/bar-chart/2~0");
  });
});
