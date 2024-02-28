import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import deepEqual from "fast-deep-equal";
import {isEnoent} from "../src/error.js";
import type {MarkdownPage, ParseContext} from "../src/markdown.js";
import {parseMarkdown} from "../src/markdown.js";
import {rewriteHtml} from "../src/markdown.js";

describe("parseMarkdown(input)", () => {
  const inputRoot = "test/input";
  const outputRoot = "test/output";
  for (const name of readdirSync(inputRoot)) {
    if (!name.endsWith(".md")) continue;
    const path = join(inputRoot, name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;

    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const snapshot = await parseMarkdown(path, {root: "test/input", path: name});
      let allequal = true;
      for (const ext of ["html", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot[ext];
        const outfile = resolve(outputRoot, `${basename(outname, ".md")}.${ext}`);
        const diffile = resolve(outputRoot, `${basename(outname, ".md")}-changed.${ext}`);
        let expected;

        try {
          expected = await readFile(outfile, "utf8");
        } catch (error) {
          if (!isEnoent(error) || process.env.CI === "true") throw error;
          console.warn(`! generating ${outfile}`);
          await mkdir(outputRoot, {recursive: true});
          await writeFile(outfile, actual, "utf8");
          continue;
        }

        const equal = ext === "json" ? jsonEqual(expected, actual) : expected === actual;

        if (equal) {
          if (process.env.CI !== "true") {
            try {
              await unlink(diffile);
              console.warn(`! deleted ${diffile}`);
            } catch (error) {
              if (!isEnoent(error)) throw error;
            }
          }
        } else {
          allequal = false;
          console.warn(`! generating ${diffile}`);
          await writeFile(diffile, actual, "utf8");
        }
      }
      assert.ok(allequal, `${name} must match snapshot`);
    });
  }
});

describe("rewriteHtml(html, root, path, context)", () => {
  const mockContext = (): ParseContext => ({code: [], assets: new Set(), startLine: 0, currentLine: 0});
  it("adds local files from img[src]", () => {
    const html = '<img src="./test.png">';
    const expected = '<img src="./_file/test.png?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855">'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./test.png"]));
  });
  it("adds local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, large.jpg 800w" sizes="(max-width: 600px) 480px, 800px" src="large.jpg" alt="Image for testing">'; // prettier-ignore
    const expected = '<img srcset="./_file/small.jpg?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 480w, ./_file/large.jpg?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 800w" sizes="(max-width: 600px) 480px, 800px" src="./_file/large.jpg?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" alt="Image for testing">'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./large.jpg", "./small.jpg"]));
  });
  it("adds local files from video[src]", () => {
    const html = '<video src="observable.mov" controls></video>'; // prettier-ignore
    const expected = '<video src="./_file/observable.mov?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" controls></video>'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./observable.mov"]));
  });
  it("adds local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="observable.mp4" type="video/mp4"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    const expected = '<video width="320" height="240" controls><source src="./_file/observable.mp4?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" type="video/mp4"><source src="./_file/observable.mov?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" type="video/mov"></video>'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./observable.mp4", "./observable.mov"]));
  });
  it("adds local files from picture source[srcset]", () => {
    const html = '<picture><source srcset="observable-logo-wide.png" media="(min-width: 600px)"><img src="observable-logo-narrow.png"></picture>'; // prettier-ignore
    const expected = '<picture><source srcset="./_file/observable-logo-wide.png?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" media="(min-width: 600px)"><img src="./_file/observable-logo-narrow.png?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"></picture>'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./observable-logo-narrow.png", "./observable-logo-wide.png"]));
  });
  it("ignores non-local files from img[src]", () => {
    const html = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Shorthair.jpg/900px-American_Shorthair.jpg">'; // prettier-ignore
    const expected = html;
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set());
  });
  it("ignores non-local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">'; // prettier-ignore
    const expected = '<img srcset="./_file/small.jpg?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./small.jpg"]));
  });
  it("ignores non-local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    const expected = '<video width="320" height="240" controls><source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"><source src="./_file/observable.mov?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" type="video/mov"></video>'; // prettier-ignore
    const context = mockContext();
    assert.strictEqual(rewriteHtml(html, "docs", "page", context), expected);
    assert.deepStrictEqual(context.assets, new Set(["./observable.mov"]));
  });
});

function jsonMeta({html, ...rest}: MarkdownPage): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
