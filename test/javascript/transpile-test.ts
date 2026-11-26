import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path/posix";
import {pathToFileURL} from "node:url";
import {temporaryDirectoryTask} from "tempy";
import {isEnoent} from "../../src/error.js";
import {parseJavaScript} from "../../src/javascript/parse.js";
import type {TranspileModuleOptions} from "../../src/javascript/transpile.js";
import {transpileJavaScript, transpileModule} from "../../src/javascript/transpile.js";
import {isPathImport} from "../../src/path.js";
import {mockJsDelivr} from "../mocks/jsdelivr.js";

function isJsFile(inputRoot: string, fileName: string) {
  if (!fileName.endsWith(".js")) return false;
  const path = join(inputRoot, fileName);
  return statSync(path).isFile();
}

function mockResolveImport(specifier: string): string {
  return isPathImport(specifier)
    ? `./${join("_import", specifier)}`
    : specifier.replace(/^npm:/, "https://cdn.jsdelivr.net/npm/");
}

function mockResolveFile(specifier: string): string {
  return isPathImport(specifier)
    ? `./${join("_file", specifier)}`
    : specifier.replace(/^npm:/, "https://cdn.jsdelivr.net/npm/");
}

function runTests(inputRoot: string, outputRoot: string, filter: (name: string) => boolean = () => true) {
  for (const name of readdirSync(inputRoot)) {
    if (!isJsFile(inputRoot, name) || !filter(name)) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    const path = join(inputRoot, name);
    (only ? it.only : skip ? it.skip : it)(path, async () => {
      const outfile = resolve(outputRoot, `${basename(outname, ".js")}.js`);
      const diffile = resolve(outputRoot, `${basename(outname, ".js")}-changed.js`);
      const input = await readFile(path, "utf8");
      let actual: string;
      let expected: string;

      try {
        const node = parseJavaScript(input, {path: name});
        actual = transpileJavaScript(node, {
          id: "0",
          path: name,
          resolveImport: mockResolveImport,
          resolveFile: mockResolveFile
        });
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        actual = `define({id: "0", body: () => { throw new SyntaxError(${JSON.stringify(error.message)}); }});\n`;
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

describe("transpileJavaScript(input, options)", () => {
  runTests("test/input", "test/output");
  runTests("test/input/imports", "test/output/imports", (name) => name.endsWith("-import.js"));
  it("trims leading and trailing newlines", async () => {
    const node = parseJavaScript("\ntest\n", {path: "index.js"});
    const body = transpileJavaScript(node, {id: "0", path: "index.js"});
    assert.strictEqual(body, 'define({id: "0", inputs: ["test","display"], body: async (test,display) => {\ndisplay(await(\ntest\n))\n}});\n'); // prettier-ignore
  });
});

describe("the static imports of a JavaScript code block", () => {
  // Runs the specified code block against a module at ./bar.js, and returns the result of the block.
  async function run(
    input: string,
    module: string
  ): Promise<{status: "fulfilled"; value: any} | {status: "rejected"; error: any}> {
    const node = parseJavaScript(input, {path: "block.js"});
    const code = transpileJavaScript(node, {id: "0", path: "block.js", resolveImport: mockResolveImport});
    return temporaryDirectoryTask(async (root) => {
      await mkdir(join(root, "_import"));
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      await writeFile(join(root, "_import", "bar.js"), module);
      await writeFile(
        join(root, "block.js"),
        `const outcomes = [];\nconst define = ({body}) => outcomes.push(body().then((value) => ({status: "fulfilled", value}), (error) => ({status: "rejected", error})));\n${code}\nexport {outcomes};\n` // prettier-ignore
      );
      const {outcomes} = await import(pathToFileURL(join(root, "block.js")).href);
      return outcomes[0];
    });
  }

  it("throws a SyntaxError for a named import that the module does not export", async () => {
    const outcome = await run('import {doesNotExist} from "./bar.js";\ndoesNotExist();', "export const foo = 1;\n"); // prettier-ignore
    assert.strictEqual(outcome.status, "rejected");
    assert.ok(outcome.error instanceof SyntaxError);
    assert.strictEqual(outcome.error.message, "The requested module './bar.js' does not provide an export named 'doesNotExist'"); // prettier-ignore
  });
  it("throws a SyntaxError for a default import that the module does not export", async () => {
    const outcome = await run('import foo from "./bar.js";\nfoo();', "export const foo = 1;\n");
    assert.strictEqual(outcome.status, "rejected");
    assert.ok(outcome.error instanceof SyntaxError);
    assert.strictEqual(
      outcome.error.message,
      "The requested module './bar.js' does not provide an export named 'default'"
    );
  });
  it("does not throw for an export whose value is undefined", async () => {
    const outcome = await run('import {foo} from "./bar.js";\nif (foo !== undefined) throw new Error("foo should be undefined");', "export let foo;\n"); // prettier-ignore
    assert.strictEqual(outcome.status, "fulfilled");
    assert.deepStrictEqual(outcome.value, {foo: undefined});
  });
  it("does not throw for a namespace import", async () => {
    const outcome = await run('import * as bar from "./bar.js";\nbar.foo();', "export const foo = () => 123;\n"); // prettier-ignore
    assert.strictEqual(outcome.status, "fulfilled");
    assert.strictEqual(typeof outcome.value.bar.foo, "function");
  });
  it("checks each import of a block", async () => {
    const outcome = await run('import {foo} from "./bar.js";\nimport {doesNotExist} from "./bar.js";\nfoo();', "export const foo = 1;\n"); // prettier-ignore
    assert.strictEqual(outcome.status, "rejected");
    assert.strictEqual(outcome.error.message, "The requested module './bar.js' does not provide an export named 'doesNotExist'"); // prettier-ignore
  });
});

async function testFile(target: string, path: string): Promise<string> {
  const input = `import {FileAttachment} from "observablehq:stdlib";\nFileAttachment(${JSON.stringify(target)})`;
  const output = await transpileModule(input, {root: "src", path});
  return output.split("\n").pop()!;
}

describe("transpileModule(input, root, path, sourcePath)", () => {
  it("rewrites relative files with import.meta.resolve", async () => {
    assert.strictEqual(await testFile("./test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("./sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("./test.txt", "sub/test.js"), 'FileAttachment("../../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("../test.txt", "sub/test.js"), 'FileAttachment("../../test.txt", import.meta.url)'); // prettier-ignore
  });
  it("does not require paths to start with ./, ../, or /", async () => {
    assert.strictEqual(await testFile("test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("test.txt", "sub/test.js"), 'FileAttachment("../../sub/test.txt", import.meta.url)'); // prettier-ignore
  });
  it("rewrites absolute files with meta", async () => {
    assert.strictEqual(await testFile("/test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("/sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("/test.txt", "sub/test.js"), 'FileAttachment("../../test.txt", import.meta.url)'); // prettier-ignore
  });
});

describe("transpileModule(input, root, path)", () => {
  mockJsDelivr();
  const options: TranspileModuleOptions = {root: "src", path: "test.js"};
  it("rewrites relative files with import.meta.resolve", async () => {
    assert.strictEqual(await testFile("./test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("./sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("./test.txt", "sub/test.js"), 'FileAttachment("../../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("../test.txt", "sub/test.js"), 'FileAttachment("../../test.txt", import.meta.url)'); // prettier-ignore
  });
  it("does not require paths to start with ./, ../, or /", async () => {
    assert.strictEqual(await testFile("test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("test.txt", "sub/test.js"), 'FileAttachment("../../sub/test.txt", import.meta.url)'); // prettier-ignore
  });
  it("rewrites absolute files with meta", async () => {
    assert.strictEqual(await testFile("/test.txt", "test.js"), 'FileAttachment("../test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("/sub/test.txt", "test.js"), 'FileAttachment("../sub/test.txt", import.meta.url)'); // prettier-ignore
    assert.strictEqual(await testFile("/test.txt", "sub/test.js"), 'FileAttachment("../../test.txt", import.meta.url)'); // prettier-ignore
  });
  it("ignores FileAttachment if masked by a reference", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\n((FileAttachment) => FileAttachment("./test.txt"))(eval)'; // prettier-ignore
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, '((FileAttachment) => FileAttachment("./test.txt"))(eval)');
  });
  it("ignores FileAttachment if not imported", async () => {
    const input = 'import {Generators} from "observablehq:stdlib";\nFileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("ignores FileAttachment if a comma expression", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\n(1, FileAttachment)("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, '(1, FileAttachment)("./test.txt")');
  });
  it("ignores FileAttachment if not imported from observablehq:stdlib", async () => {
    const input = 'import {FileAttachment} from "observablehq:inputs";\nFileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("rewrites FileAttachment when aliased", async () => {
    const input = 'import {FileAttachment as F} from "observablehq:stdlib";\nF("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'F("../test.txt", import.meta.url)');
  });
  it("rewrites FileAttachment when aliased to a global", async () => {
    const input = 'import {FileAttachment as File} from "observablehq:stdlib";\nFile("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'File("../test.txt", import.meta.url)');
  });
  it.skip("rewrites FileAttachment when imported as a namespace", async () => {
    const input = 'import * as O from "observablehq:stdlib";\nO.FileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'O.FileAttachment("../test.txt", import.meta.url)');
  });
  it("ignores non-FileAttachment calls", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\nFile("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'File("./test.txt")');
  });
  it("rewrites single-quoted literals", async () => {
    const input = "import {FileAttachment} from \"observablehq:stdlib\";\nFileAttachment('./test.txt')";
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("rewrites template-quoted literals", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment(`./test.txt`)';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("throws a syntax error with non-literal calls", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment(`./${test}.txt`)';
    await assert.rejects(() => transpileModule(input, options), /FileAttachment requires a single literal string/); // prettier-ignore
  });
  it("throws a syntax error with URL fetches", async () => {
    const input = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment("https://example.com")';
    await assert.rejects(() => transpileModule(input, options), /non-local file path/); // prettier-ignore
  });
  it("ignores non-local path fetches", async () => {
    const input1 = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment("../test.txt")';
    const input2 = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment("./../test.txt")';
    const input3 = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment("../../test.txt")';
    const input4 = 'import {FileAttachment} from "observablehq:stdlib";\nFileAttachment("./../../test.txt")';
    await assert.rejects(() => transpileModule(input1, options), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input2, options), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input3, {...options, path: "sub/test.js"}), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input4, {...options, path: "sub/test.js"}), /non-local file path/); // prettier-ignore
  });
  it("rewrites npm imports", async () => {
    const input = 'import "npm:d3-array";';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'import "../_npm/d3-array@3.2.4/_esm.js";');
  });
  it("rewrites node imports", async () => {
    const input = 'import "d3-array";';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'import "../_node/d3-array@3.2.4/index.js";');
  });
});
