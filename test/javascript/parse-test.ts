import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {isEnoent} from "../../src/error.js";
import type {JavaScriptNode} from "../../src/javascript/parse.js";
import {parseJavaScript} from "../../src/javascript/parse.js";

function isJsFile(inputRoot: string, fileName: string) {
  if (!fileName.endsWith(".js")) return false;
  const path = join(inputRoot, fileName);
  return statSync(path).isFile();
}

function redactJavaScript({input, ...node}: JavaScriptNode): Omit<JavaScriptNode, "input"> {
  return node;
}

// Convert to a serializable representation.
function stringify(key: string, value: any): any {
  return typeof value === "bigint" ? value.toString() : value instanceof Map ? [...value] : value;
}

function runTests(inputRoot: string, outputRoot: string, filter: (name: string) => boolean = () => true) {
  for (const name of readdirSync(inputRoot)) {
    if (!isJsFile(inputRoot, name) || !filter(name)) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    const path = join(inputRoot, name);
    (only ? it.only : skip ? it.skip : it)(path, async () => {
      const outfile = resolve(outputRoot, `${outname}.json`);
      const diffile = resolve(outputRoot, `${outname}-changed.json`);
      const input = await readFile(path, "utf8");
      let actual: string;
      let expected: string;

      try {
        actual = JSON.stringify(redactJavaScript(parseJavaScript(input, {path: name})), stringify, 2);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        actual = JSON.stringify({error: error.message}, null, 2);
      }

      try {
        expected = await readFile(outfile, "utf8");
      } catch (error) {
        if (!isEnoent(error) || process.env.CI === "true") throw error;
        console.warn(`! generating ${outfile}`);
        await mkdir(outputRoot, {recursive: true});
        await writeFile(outfile, actual, "utf8");
        return;
      }

      const equal = expected === actual;

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
        console.warn(`! generating ${diffile}`);
        await writeFile(diffile, actual, "utf8");
      }

      assert.ok(equal, `${name} must match snapshot`);
    });
  }
}

describe("parseJavaScript(input, options)", () => {
  runTests("test/input", "test/output");
  runTests("test/input/imports", "test/output/imports", (name) => name.endsWith("-import.js"));
});
