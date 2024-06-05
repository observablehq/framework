import assert from "node:assert";
import {parsePlaceholder} from "../src/placeholder.js";

function placeholders(input: string, start = 0): {type: string; value: string}[] {
  return Array.from(parsePlaceholder(input, start));
}

describe("parsePlaceholder", () => {
  it("finds placeholders within data", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "'world'"},
        {type: "content", value: "!"}
      ],
      placeholders("Hello, ${'world'}!")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "'world'"}
      ],
      placeholders("Hello, ${'world'}")
    );
    assert.deepStrictEqual(
      [
        {type: "code", value: "'world'"},
        {type: "content", value: "!"}
      ],
      placeholders("${'world'}!")
    );
    assert.deepStrictEqual([{type: "code", value: "'world'"}], placeholders("${'world'}"));
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, _"},
        {type: "code", value: "'world'"},
        {type: "content", value: "_"}
      ],
      placeholders("Hello, _${'world'}_")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "1<"},
        {type: "code", value: "2"}
      ],
      placeholders("1<${2}")
    );
  });
  it("finds multiple placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "("},
        {type: "code", value: "1"},
        {type: "content", value: " "},
        {type: "code", value: "2"},
        {type: "content", value: " "},
        {type: "code", value: "3"},
        {type: "content", value: " "},
        {type: "code", value: "4"},
        {type: "content", value: ")"}
      ],
      placeholders("(${1} ${2} ${3} ${4})")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "("},
        {type: "code", value: "1"},
        {type: "code", value: "2"},
        {type: "content", value: "+"},
        {type: "code", value: "3"},
        {type: "content", value: " + "},
        {type: "code", value: "4"},
        {type: "content", value: ")"}
      ],
      placeholders("(${1}${2}+${3} + ${4})")
    );
    assert.deepStrictEqual(
      [
        {type: "code", value: "1"},
        {type: "code", value: "2"},
        {type: "code", value: "3"},
        {type: "code", value: "4"}
      ],
      placeholders("${1}${2}${3}${4}")
    );
  });
  it("finds empty placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "("},
        {type: "code", value: ""},
        {type: "content", value: ")"}
      ],
      placeholders("(${})")
    );
    assert.deepStrictEqual(
      [
        {type: "code", value: ""},
        {type: "code", value: ""}
      ],
      placeholders("${}${}")
    );
  });
  it("removes backslash before dollar sign", () => {
    assert.deepStrictEqual([{type: "content", value: "(${})"}], placeholders("(\\${})"));
    assert.deepStrictEqual(
      [{type: "content", value: "($)"}],
      placeholders("(\\$)") // curly braces not required
    );
    assert.deepStrictEqual(
      [{type: "content", value: "(\\${})"}],
      placeholders("(\\\\${})") // only the last backslash is special
    );
    assert.deepStrictEqual(
      [{type: "content", value: "(\\\\${})"}],
      placeholders("(\\\\\\${})") // only the last backslash is special
    );
  });
  it("removes backslashes after dollar signs and before left braces", () => {
    assert.deepStrictEqual([{type: "content", value: "(${})"}], placeholders("($\\{})"));
    assert.deepStrictEqual(
      [{type: "content", value: "(${)"}],
      placeholders("($\\{)") // curly braces not required
    );
    assert.deepStrictEqual(
      [{type: "content", value: "(\\{})"}],
      placeholders("(\\{})") // dollar sign is required
    );
    assert.deepStrictEqual(
      [{type: "content", value: "($\\{})"}],
      placeholders("(\\$\\{})") // dollar sign must not be escaped
    );
    assert.deepStrictEqual(
      [{type: "content", value: "($\\{})"}],
      placeholders("($\\\\{})") // only the last backslash is special
    );
    assert.deepStrictEqual(
      [{type: "content", value: "($\\\\{})"}],
      placeholders("($\\\\\\{})") // only the last backslash is special
    );
  });
  it("does not remove backslashes before other left braces", () => {
    assert.deepStrictEqual([{type: "content", value: "(\\{})"}], placeholders("(\\{})"));
  });
  it("parses comments within placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "1 /*}*/ + 2"}
      ],
      placeholders("Hello, ${1 /*}*/ + 2}")
    );
  });
  it("parses braces within placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "{foo: {bar: {}}}"}
      ],
      placeholders("Hello, ${{foo: {bar: {}}}}")
    );
    assert.deepStrictEqual(
      [{type: "code", value: "(function*() { yield 42; })()"}],
      placeholders("${(function*() { yield 42; })()}")
    );
    assert.deepStrictEqual(
      [{type: "code", value: "(async function*() { await (yield 42); })()"}],
      placeholders("${(async function*() { await (yield 42); })()}")
    );
  });
  it("parses invalid syntax", () => {
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "1,"}
      ],
      placeholders("Hello, ${1,}")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "void"}
      ],
      placeholders("Hello, ${void}")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "foo: [1, 2]"}
      ],
      placeholders("Hello, ${foo: [1, 2]}")
    );
    assert.deepStrictEqual(
      [
        {type: "content", value: "Hello, "},
        {type: "code", value: "yield 42"}
      ],
      placeholders("Hello, ${yield 42}")
    );
  });
  // Note: this case is not encountered in practice due to markdown-it tokenization.
  it("ignores placeholders within attributes", () => {
    assert.deepStrictEqual(
      [{type: "content", value: "<a href=${'link'}>text</a>"}],
      placeholders("<a href=${'link'}>text</a>")
    );
    assert.deepStrictEqual(
      [{type: "content", value: "<a href='${'link'}'>text</a>"}],
      placeholders("<a href='${'link'}'>text</a>")
    );
  });
  // Note: this case is not encountered in practice due to markdown-it tokenization.
  it("ignores placeholders within tags", () => {
    assert.deepStrictEqual([{type: "content", value: "<a ${'attr'}>text</a>"}], placeholders("<a ${'attr'}>text</a>"));
  });
  it("ignores placeholders within rawtext", () => {
    assert.deepStrictEqual(
      [{type: "content", value: "<script>${1 + 2}</script>"}],
      placeholders("<script>${1 + 2}</script>")
    );
    assert.deepStrictEqual(
      [{type: "content", value: "<style>${1 + 2}</style>"}],
      placeholders("<style>${1 + 2}</style>")
    );
    assert.deepStrictEqual(
      [{type: "content", value: "<textarea>${1 + 2}</textarea>"}],
      placeholders("<textarea>${1 + 2}</textarea>")
    );
    assert.deepStrictEqual(
      [{type: "content", value: "<title>${1 + 2}</title>"}],
      placeholders("<title>${1 + 2}</title>")
    );
  });
  it("ignores placeholders within code", () => {
    assert.deepStrictEqual([{type: "content", value: "`${1 + 2}`"}], placeholders("`${1 + 2}`"));
    assert.deepStrictEqual([{type: "content", value: "``${1 + 2}``"}], placeholders("``${1 + 2}``"));
    assert.deepStrictEqual([{type: "content", value: "``${`1 + 2`}``"}], placeholders("``${`1 + 2`}``"));
  });
  it("ignores placeholders within comment", () => {
    assert.deepStrictEqual([{type: "content", value: "<!--${1 + 2}-->"}], placeholders("<!--${1 + 2}-->"));
    assert.deepStrictEqual([{type: "content", value: "<!-- ${1 + 2} -->"}], placeholders("<!-- ${1 + 2} -->"));
    assert.deepStrictEqual(
      [
        {type: "content", value: "<!--```\n\n${1}\n\n```-->\n"},
        {type: "code", value: "1"}
      ],
      placeholders("<!--```\n\n${1}\n\n```-->\n${1}")
    );
  });
  it("ignores unterminated placeholders", () => {
    assert.deepStrictEqual([{type: "content", value: "${1 + 2"}], placeholders("${1 + 2"));
    assert.deepStrictEqual(
      [{type: "content", value: "Hello, ${{foo: [1, 2]}"}],
      placeholders("Hello, ${{foo: [1, 2]}")
    );
    assert.deepStrictEqual(
      [{type: "content", value: "Hello, ${`unterminated}"}],
      placeholders("Hello, ${`unterminated}")
    );
  });
});
