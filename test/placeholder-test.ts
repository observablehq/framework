import assert from "node:assert";
import {parsePlaceholder} from "../src/placeholder.js";

function placeholders(input: string, start = 0): string[] {
  return Array.from(parsePlaceholder(input, start), ([i, j]) => input.slice(i, j));
}

describe("parsePlaceholder", () => {
  it("finds placeholders within data", () => {
    assert.deepStrictEqual(["'world'"], placeholders("Hello, ${'world'}"));
    assert.deepStrictEqual(["'world'"], placeholders("Hello, _${'world'}_"));
    assert.deepStrictEqual(["2"], placeholders("1<${2}"));
  });
  it("finds multiple placeholders", () => {
    assert.deepStrictEqual(["1", "2", "3", "4"], placeholders("(${1} ${2} ${3} ${4})"));
    assert.deepStrictEqual(["1", "2", "3", "4"], placeholders("(${1}${2}+${3} + ${4})"));
  });
  it("finds empty placeholders", () => {
    assert.deepStrictEqual([""], placeholders("(${})"));
  });
  it("parses comments within placeholders", () => {
    assert.deepStrictEqual(["1 /*}*/ + 2"], placeholders("Hello, ${1 /*}*/ + 2}"));
  });
  it("parses braces within placeholders", () => {
    assert.deepStrictEqual(["{foo: {bar: {}}}"], placeholders("Hello, ${{foo: {bar: {}}}}"));
    assert.deepStrictEqual(["(function*() { yield 42; })()"], placeholders("${(function*() { yield 42; })()}"));
    assert.deepStrictEqual(["(async function*() { await (yield 42); })()"], placeholders("${(async function*() { await (yield 42); })()}")); // prettier-ignore
  });
  it("parses invalid syntax", () => {
    assert.deepStrictEqual(["1,"], placeholders("Hello, ${1,}"));
    assert.deepStrictEqual(["void"], placeholders("Hello, ${void}"));
    assert.deepStrictEqual(["foo: [1, 2]"], placeholders("Hello, ${foo: [1, 2]}"));
    assert.deepStrictEqual(["yield 42"], placeholders("Hello, ${yield 42}"));
  });
  // Note: this case is not encountered in practice due to markdown-it tokenization.
  it("ignores placeholders within attributes", () => {
    assert.deepStrictEqual([], placeholders("<a href=${'link'}>text</a>"));
    assert.deepStrictEqual([], placeholders("<a href='${'link'}'>text</a>"));
  });
  // Note: this case is not encountered in practice due to markdown-it tokenization.
  it("ignores placeholders within tags", () => {
    assert.deepStrictEqual([], placeholders("<a ${'attr'}>text</a>"));
  });
  it("ignores placeholders within rawtext", () => {
    assert.deepStrictEqual([], placeholders("<script>${1 + 2}</script>"));
    assert.deepStrictEqual([], placeholders("<style>${1 + 2}</style>"));
    assert.deepStrictEqual([], placeholders("<textarea>${1 + 2}</textarea>"));
    assert.deepStrictEqual([], placeholders("<title>${1 + 2}</title>"));
  });
  it("ignores placeholders within comment", () => {
    assert.deepStrictEqual([], placeholders("<!--${1 + 2}-->"));
    assert.deepStrictEqual([], placeholders("<!-- ${1 + 2} -->"));
  });
  it("ignores unteriminated placeholders", () => {
    assert.deepStrictEqual([], placeholders("${1 + 2"));
    assert.deepStrictEqual([], placeholders("Hello, ${{foo: [1, 2]}"));
    assert.deepStrictEqual([], placeholders("Hello, ${`unterminated}"));
  });
});
