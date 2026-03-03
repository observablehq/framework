import assert from "node:assert";
import {normalizeConfig} from "../src/config.js";
import {parseMarkdown} from "../src/markdown.js";

describe("codeExtensions", () => {
  it("transforms content with custom extension", () => {
    const {md, codeExtensions} = normalizeConfig({
      root: "docs",
      codeExtensions: {
        uppercase: (content: string) => {
          return JSON.stringify(content.trim().toUpperCase());
        }
      }
    });

    const input = "```uppercase\nhello world\n```";
    const page = parseMarkdown(input, {path: "test.md", md, codeExtensions});

    assert.strictEqual(page.code.length, 1, "should have one code block");
    const source = page.code[0].node.input;
    assert.ok(source.includes("HELLO WORLD"), "should transform content to uppercase");
  });
});