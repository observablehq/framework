import {parseMarkdown} from "../src/markdown";
import assert from "assert";

describe("parseMarkdown(source)", () => {
  it("parses markdown", () => {
    const result = parseMarkdown(`# hello, world`);
    assert.equal(result.html, `<h1>hello, world</h1>\n`);
  });

  it("parses JS codeblock", () => {
    const result = parseMarkdown(`# hello, world\n
\`\`\`js show\n
console.log("hello, world");\n
\`\`\`\n`);
    assert.deepStrictEqual(result, {
      html:
        "<h1>hello, world</h1>\n" +
        '<div id="cell-1" class="observablehq observablehq--block"></div>\n' +
        '<pre><code class="language-js">\n' +
        '<span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(<span class="hljs-string">&quot;hello, world&quot;</span>);\n' +
        "\n" +
        "</code></pre>\n",
      id: 1,
      js: "\n" + "define({id: 1, inputs: [], body: () => {\n" + 'console.log("hello, world");\n' + "}});\n"
    });
  });

  it("parses inline placeholders", () => {
    const result = parseMarkdown(`
  # hello, world
  
  one plus two is ${1 + 2}.
  `);
    assert.deepStrictEqual(result, {
      html: "<h1>hello, world</h1>\n<p>one plus two is 3.</p>\n",
      id: 0,
      js: ""
    });
  });

  it("parses front YAML", () => {
    const result = parseMarkdown(`---
style:
  - one
  - two
---
# hello, world`);
    assert.deepStrictEqual(result, {
      html: "<>\n<h1>hello, world</h1>\n",
      id: 0,
      js: "",
      front: {style: ["one", "two"]}
    });
  });
});
