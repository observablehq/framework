import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {transpileJavaScript} from "../src/javascript.js";
import {renderDefineCell} from "../src/render.js";

function isJsFile(inputRoot: string, fileName: string) {
  if (!fileName.endsWith(".js")) return false;
  const path = join(inputRoot, fileName);
  return statSync(path).isFile();
}

function runTests({
  inputRoot,
  outputRoot,
  filter = () => true
}: {
  inputRoot: string;
  outputRoot: string;
  filter?: (name: string) => boolean;
}) {
  for (const name of readdirSync(inputRoot)) {
    if (!isJsFile(inputRoot, name) || !filter(name)) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    const path = join(inputRoot, name);
    (only ? it.only : skip ? it.skip : it)(path, async () => {
      const outfile = resolve(outputRoot, `${basename(outname, ".js")}.js`);
      const diffile = resolve(outputRoot, `${basename(outname, ".js")}-changed.js`);
      const actual = renderDefineCell(
        await transpileJavaScript(await readFile(path, "utf8"), {
          id: "0",
          root: inputRoot,
          sourcePath: "/"
        })
      );
      let expected;

      try {
        expected = await readFile(outfile, "utf8");
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
          console.warn(`! generating ${outfile}`);
          await writeFile(outfile, actual, "utf8");
          return;
        } else {
          throw error;
        }
      }

      const equal = expected === actual;

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
        console.warn(`! generating ${diffile}`);
        await writeFile(diffile, actual, "utf8");
      }

      assert.ok(equal, `${name} must match snapshot`);
    });
  }
}

describe("transpileJavaScript(input)", () => {
  runTests({
    inputRoot: "test/input",
    outputRoot: "test/output"
  });
});

describe("imports", () => {
  runTests({
    inputRoot: "test/input/imports",
    outputRoot: "test/output/imports",
    filter: (name) => name.endsWith("-import.js")
  });
});
