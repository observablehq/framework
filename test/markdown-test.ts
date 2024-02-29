import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import deepEqual from "fast-deep-equal";
import {isEnoent} from "../src/error.js";
import type {MarkdownPage} from "../src/markdown.js";
import {parseMarkdown} from "../src/markdown.js";

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

function jsonMeta({html, ...rest}: MarkdownPage): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
