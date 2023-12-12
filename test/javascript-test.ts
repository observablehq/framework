import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isEnoent} from "../src/error.js";
import {transpileJavaScript} from "../src/javascript.js";
import {renderDefineCell} from "../src/render.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

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
      const {body, ...transpile} = transpileJavaScript(await readFile(path, "utf8"), {
        id: "0",
        root: inputRoot,
        sourcePath: name,
        verbose: false
      });
      const actual = renderDefineCell({body: await body(), ...transpile});
      let expected;

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

describe("transpileJavaScript(input, options)", () => {
  mockJsDelivr();

  runTests({
    inputRoot: "test/input",
    outputRoot: "test/output"
  });

  runTests({
    inputRoot: "test/input/imports",
    outputRoot: "test/output/imports",
    filter: (name) => name.endsWith("-import.js")
  });

  it("trims leading and trailing newlines", async () => {
    const {body} = transpileJavaScript("\ntest\n", {
      id: "0",
      root: "test/input",
      sourcePath: "index.js",
      verbose: false
    });
    assert.strictEqual(await body(), "async (test,display) => {\ndisplay(await(\ntest\n))\n}");
  });
  it("rethrows unexpected errors", () => {
    const expected = new Error();
    assert.throws(
      () =>
        transpileJavaScript(
          {
            toString(): string {
              throw expected;
            }
          } as string,
          {
            id: "0",
            root: "test/input",
            sourcePath: "index.js",
            verbose: false
          }
        ),
      expected
    );
  });
  it("respects the sourceLine option", async () => {
    const {body} = transpileJavaScript("foo,", {
      id: "0",
      root: "test/input",
      sourcePath: "index.js",
      sourceLine: 12,
      inline: true,
      verbose: false
    });
    assert.strictEqual(await body(), '() => { throw new SyntaxError("invalid expression"); }');
  });
});
