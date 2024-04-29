import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path/posix";
import deepEqual from "fast-deep-equal";
import {normalizeConfig} from "../src/config.js";
import {isEnoent} from "../src/error.js";
import type {MarkdownPage} from "../src/markdown.js";
import {makeLinkNormalizer, parseMarkdown} from "../src/markdown.js";

const {md} = normalizeConfig({root: "docs"});

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
      const source = await readFile(path, "utf8");
      const snapshot = parseMarkdown(source, {path: name, md});
      let allequal = true;
      for (const ext of ["html", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot.body;
        const outfile = resolve(outputRoot, `${ext === "json" ? outname : basename(outname, ".md")}.${ext}`);
        const diffile = resolve(outputRoot, `${ext === "json" ? outname : basename(outname, ".md")}-changed.${ext}`);
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

describe("makeLinkNormalizer(normalize, false)", () => {
  const normalize = makeLinkNormalizer(String, false);
  it("appends .html to extension-less links", () => {
    assert.strictEqual(normalize("foo"), "foo.html");
  });
  it("does not append .html to extensioned links", () => {
    assert.strictEqual(normalize("foo.png"), "foo.png");
    assert.strictEqual(normalize("foo.html"), "foo.html");
    assert.strictEqual(normalize("foo.md"), "foo.md");
  });
  it("converts index links to directories", () => {
    assert.strictEqual(normalize("foo/index"), "foo/");
    assert.strictEqual(normalize("foo/index.html"), "foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "/");
    assert.strictEqual(normalize("/index.html"), "/");
    assert.strictEqual(normalize("index"), ".");
    assert.strictEqual(normalize("index.html"), ".");
  });
  it("preserves links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
  });
  it("preserves a relative path", () => {
    assert.strictEqual(normalize("./foo"), "./foo.html");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo"), "../foo.html");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
    assert.strictEqual(normalize("/foo"), "/foo.html");
    assert.strictEqual(normalize("/foo.png"), "/foo.png");
  });
  it("preserves the query", () => {
    assert.strictEqual(normalize("foo.png?bar"), "foo.png?bar");
    assert.strictEqual(normalize("foo.html?bar"), "foo.html?bar");
    assert.strictEqual(normalize("foo?bar"), "foo.html?bar");
  });
  it("preserves the hash", () => {
    assert.strictEqual(normalize("foo.png#bar"), "foo.png#bar");
    assert.strictEqual(normalize("foo.html#bar"), "foo.html#bar");
    assert.strictEqual(normalize("foo#bar"), "foo.html#bar");
  });
  it("preserves the query and hash", () => {
    assert.strictEqual(normalize("foo.png?bar#baz"), "foo.png?bar#baz");
    assert.strictEqual(normalize("foo.html?bar#baz"), "foo.html?bar#baz");
    assert.strictEqual(normalize("foo?bar#baz"), "foo.html?bar#baz");
  });
});

describe("makeLinkNormalizer(normalize, true)", () => {
  const normalize = makeLinkNormalizer(String, true);
  it("does not append .html to extension-less links", () => {
    assert.strictEqual(normalize("foo"), "foo");
  });
  it("does not append .html to extensioned links", () => {
    assert.strictEqual(normalize("foo.png"), "foo.png");
    assert.strictEqual(normalize("foo.md"), "foo.md");
  });
  it("removes .html from extensioned links", () => {
    assert.strictEqual(normalize("foo.html"), "foo");
  });
  it("converts index links to directories", () => {
    assert.strictEqual(normalize("foo/index"), "foo/");
    assert.strictEqual(normalize("foo/index.html"), "foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "/");
    assert.strictEqual(normalize("/index.html"), "/");
    assert.strictEqual(normalize("index"), ".");
    assert.strictEqual(normalize("index.html"), ".");
  });
  it("preserves links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
  });
  it("preserves a relative path", () => {
    assert.strictEqual(normalize("./foo"), "./foo");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo"), "../foo");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
    assert.strictEqual(normalize("/foo"), "/foo");
    assert.strictEqual(normalize("/foo.png"), "/foo.png");
  });
  it("preserves the query", () => {
    assert.strictEqual(normalize("foo.png?bar"), "foo.png?bar");
    assert.strictEqual(normalize("foo.html?bar"), "foo?bar");
    assert.strictEqual(normalize("foo?bar"), "foo?bar");
  });
  it("preserves the hash", () => {
    assert.strictEqual(normalize("foo.png#bar"), "foo.png#bar");
    assert.strictEqual(normalize("foo.html#bar"), "foo#bar");
    assert.strictEqual(normalize("foo#bar"), "foo#bar");
  });
  it("preserves the query and hash", () => {
    assert.strictEqual(normalize("foo.png?bar#baz"), "foo.png?bar#baz");
    assert.strictEqual(normalize("foo.html?bar#baz"), "foo?bar#baz");
    assert.strictEqual(normalize("foo?bar#baz"), "foo?bar#baz");
  });
});

function jsonMeta({head, header, body, footer, ...rest}: MarkdownPage): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
