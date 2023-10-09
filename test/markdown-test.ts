import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {type ParseResult, parseMarkdown} from "../src/markdown.js";
import deepEqual from "fast-deep-equal";

describe("parseMarkdown(input)", () => {
  for (const name of readdirSync("./test/input")) {
    if (!name.endsWith(".md")) continue;
    const path = join("./test/input", name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const snapshot = parseMarkdown(await readFile(path, "utf8"), "test/input");
      let allequal = true;
      for (const ext of ["html", "js", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot[ext];
        const outfile = resolve("./test/output", `${basename(outname, ".md")}.${ext}`);
        const diffile = resolve("./test/output", `${basename(outname, ".md")}-changed.${ext}`);
        let expected;

        try {
          expected = await readFile(outfile, "utf8");
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
            console.warn(`! generating ${outfile}`);
            await writeFile(outfile, actual, "utf8");
            continue;
          } else {
            throw error;
          }
        }

        const equal = ext === "json" ? jsonEqual(expected, actual) : expected === actual;

        if (equal) {
          if (process.env.CI !== "true") {
            try {
              await unlink(diffile);
              console.warn(`! deleted ${diffile}`);
            } catch (error) {
              if (!isNodeError(error) || error.code !== "ENOENT") {
                throw error;
              }
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

function jsonMeta({html, js, ...rest}: ParseResult): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
