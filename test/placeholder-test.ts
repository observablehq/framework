import assert from "node:assert";
import {parsePlaceholder} from "../src/placeholder.js";

function placeholders(input: string, start = 0): {type: string; content: string; pos: number}[] {
  return Array.from(parsePlaceholder(input, start));
}

describe("parsePlaceholder", () => {
  it("finds placeholders within data", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "'world'", pos: 17},
        {type: "html_block", content: "!", pos: 18}
      ],
      placeholders("Hello, ${'world'}!")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "'world'", pos: 17}
      ],
      placeholders("Hello, ${'world'}")
    );
    assert.deepStrictEqual(
      [
        {type: "placeholder", content: "'world'", pos: 10},
        {type: "html_block", content: "!", pos: 11}
      ],
      placeholders("${'world'}!")
    );
    assert.deepStrictEqual([{type: "placeholder", content: "'world'", pos: 10}], placeholders("${'world'}"));
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, _", pos: 8},
        {type: "placeholder", content: "'world'", pos: 18},
        {type: "html_block", content: "_", pos: 19}
      ],
      placeholders("Hello, _${'world'}_")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "1<", pos: 2},
        {type: "placeholder", content: "2", pos: 6}
      ],
      placeholders("1<${2}")
    );
  });
  it("finds multiple placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "(", pos: 1},
        {type: "placeholder", content: "1", pos: 5},
        {type: "html_block", content: " ", pos: 6},
        {type: "placeholder", content: "2", pos: 10},
        {type: "html_block", content: " ", pos: 11},
        {type: "placeholder", content: "3", pos: 15},
        {type: "html_block", content: " ", pos: 16},
        {type: "placeholder", content: "4", pos: 20},
        {type: "html_block", content: ")", pos: 21}
      ],
      placeholders("(${1} ${2} ${3} ${4})")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "(", pos: 1},
        {type: "placeholder", content: "1", pos: 5},
        {type: "placeholder", content: "2", pos: 9},
        {type: "html_block", content: "+", pos: 10},
        {type: "placeholder", content: "3", pos: 14},
        {type: "html_block", content: " + ", pos: 17},
        {type: "placeholder", content: "4", pos: 21},
        {type: "html_block", content: ")", pos: 22}
      ],
      placeholders("(${1}${2}+${3} + ${4})")
    );
    assert.deepStrictEqual(
      [
        {type: "placeholder", content: "1", pos: 4},
        {type: "placeholder", content: "2", pos: 8},
        {type: "placeholder", content: "3", pos: 12},
        {type: "placeholder", content: "4", pos: 16}
      ],
      placeholders("${1}${2}${3}${4}")
    );
  });
  it("finds empty placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "(", pos: 1},
        {type: "placeholder", content: "", pos: 4},
        {type: "html_block", content: ")", pos: 5}
      ],
      placeholders("(${})")
    );
    assert.deepStrictEqual(
      [
        {type: "placeholder", content: "", pos: 3},
        {type: "placeholder", content: "", pos: 6}
      ],
      placeholders("${}${}")
    );
  });
  it("removes backslash before dollar sign", () => {
    assert.deepStrictEqual([{type: "html_block", content: "(${})", pos: 6}], placeholders("(\\${})"));
    assert.deepStrictEqual(
      [{type: "html_block", content: "($)", pos: 4}],
      placeholders("(\\$)") // curly braces not required
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "(\\${})", pos: 7}],
      placeholders("(\\\\${})") // only the last backslash is special
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "(\\\\${})", pos: 8}],
      placeholders("(\\\\\\${})") // only the last backslash is special
    );
  });
  it("removes backslashes after dollar signs and before left braces", () => {
    assert.deepStrictEqual([{type: "html_block", content: "(${})", pos: 6}], placeholders("($\\{})"));
    assert.deepStrictEqual(
      [{type: "html_block", content: "(${)", pos: 5}],
      placeholders("($\\{)") // curly braces not required
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "(\\{})", pos: 5}],
      placeholders("(\\{})") // dollar sign is required
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "($\\{})", pos: 7}],
      placeholders("(\\$\\{})") // dollar sign must not be escaped
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "($\\{})", pos: 7}],
      placeholders("($\\\\{})") // only the last backslash is special
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "($\\\\{})", pos: 8}],
      placeholders("($\\\\\\{})") // only the last backslash is special
    );
  });
  it("does not remove backslashes before other left braces", () => {
    assert.deepStrictEqual([{type: "html_block", content: "(\\{})", pos: 5}], placeholders("(\\{})"));
  });
  it("parses comments within placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "1 /*}*/ + 2", pos: 21}
      ],
      placeholders("Hello, ${1 /*}*/ + 2}")
    );
  });
  it("parses braces within placeholders", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "{foo: {bar: {}}}", pos: 26}
      ],
      placeholders("Hello, ${{foo: {bar: {}}}}")
    );
    assert.deepStrictEqual(
      [{type: "placeholder", content: "(function*() { yield 42; })()", pos: 32}],
      placeholders("${(function*() { yield 42; })()}")
    );
    assert.deepStrictEqual(
      [{type: "placeholder", content: "(async function*() { await (yield 42); })()", pos: 46}],
      placeholders("${(async function*() { await (yield 42); })()}")
    );
  });
  it("parses invalid syntax", () => {
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "1,", pos: 12}
      ],
      placeholders("Hello, ${1,}")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "void", pos: 14}
      ],
      placeholders("Hello, ${void}")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "foo: [1, 2]", pos: 21}
      ],
      placeholders("Hello, ${foo: [1, 2]}")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "Hello, ", pos: 7},
        {type: "placeholder", content: "yield 42", pos: 18}
      ],
      placeholders("Hello, ${yield 42}")
    );
  });
  it("ignores placeholders with invalid tokens", () => {
    assert.deepStrictEqual([{type: "html_block", content: "Hello, ${`1,}!", pos: 14}], placeholders("Hello, ${`1,}!"));
    assert.deepStrictEqual(
      [{type: "html_block", content: "Hello, ${'\\u'}!", pos: 15}],
      placeholders("Hello, ${'\\u'}!")
    );
  });
  it("ignores placeholders within attributes", () => {
    assert.deepStrictEqual(
      [{type: "html_block", content: "<div><a href=${'link'}>text</a></div>", pos: 37}],
      placeholders("<div><a href=${'link'}>text</a></div>")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "<div><a href='${'link'}'>text</a></div>", pos: 39}],
      placeholders("<div><a href='${'link'}'>text</a></div>")
    );
  });
  it("ignores placeholders within tags", () => {
    assert.deepStrictEqual(
      [{type: "html_block", content: "<div><a ${'attr'}>text</a></div>", pos: 32}],
      placeholders("<div><a ${'attr'}>text</a></div>")
    );
  });
  it("ignores placeholders within rawtext", () => {
    assert.deepStrictEqual(
      [{type: "html_block", content: "<script>${1 + 2}</script>", pos: 25}],
      placeholders("<script>${1 + 2}</script>")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "<style>${1 + 2}</style>", pos: 23}],
      placeholders("<style>${1 + 2}</style>")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "<textarea>${1 + 2}</textarea>", pos: 29}],
      placeholders("<textarea>${1 + 2}</textarea>")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "<title>${1 + 2}</title>", pos: 23}],
      placeholders("<title>${1 + 2}</title>")
    );
  });
  it("ignores placeholders within comment", () => {
    assert.deepStrictEqual(
      [{type: "html_block", content: "<!--${1 + 2}-->", pos: 15}],
      placeholders("<!--${1 + 2}-->")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "<!-- ${1 + 2} -->", pos: 17}],
      placeholders("<!-- ${1 + 2} -->")
    );
    assert.deepStrictEqual(
      [
        {type: "html_block", content: "<!--```\n\n${1}\n\n```-->\n", pos: 22},
        {type: "placeholder", content: "1", pos: 26}
      ],
      placeholders("<!--```\n\n${1}\n\n```-->\n${1}")
    );
  });
  it("ignores unterminated placeholders", () => {
    assert.deepStrictEqual([{type: "html_block", content: "${1 + 2", pos: 7}], placeholders("${1 + 2"));
    assert.deepStrictEqual(
      [{type: "html_block", content: "Hello, ${{foo: [1, 2]}", pos: 22}],
      placeholders("Hello, ${{foo: [1, 2]}")
    );
    assert.deepStrictEqual(
      [{type: "html_block", content: "Hello, ${`unterminated}", pos: 23}],
      placeholders("Hello, ${`unterminated}")
    );
  });
});
