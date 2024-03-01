import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isEnoent} from "../../src/error.js";
import {parseJavaScript} from "../../src/javascript/parse.js";
import type {TranspileModuleOptions} from "../../src/javascript/transpile.js";
import {transpileJavaScript, transpileModule} from "../../src/javascript/transpile.js";

function isJsFile(inputRoot: string, fileName: string) {
  if (!fileName.endsWith(".js")) return false;
  const path = join(inputRoot, fileName);
  return statSync(path).isFile();
}

function mockResolveImport(specifier: string): string {
  return specifier.replace(/^npm:/, "https://cdn.jsdelivr.net/npm/");
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
        actual = transpileJavaScript(node, {id: "0", resolveImport: mockResolveImport});
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
    const body = transpileJavaScript(node, {id: "0"});
    assert.strictEqual(body, 'define({id: "0", inputs: ["test","display"], body: async (test,display) => {\ndisplay(await(\ntest\n))\n}});\n'); // prettier-ignore
  });
});

async function testFile(target: string, path: string): Promise<string> {
  const input = `import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(${JSON.stringify(target)})`;
  const output = await transpileModule(input, {root: "docs", path});
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
  const options: TranspileModuleOptions = {root: "docs", path: "test.js"};
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
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\n((FileAttachment) => FileAttachment("./test.txt"))(eval)'; // prettier-ignore
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, '((FileAttachment) => FileAttachment("./test.txt"))(eval)');
  });
  it("ignores FileAttachment if not imported", async () => {
    const input = 'import {Generators} from "npm:@observablehq/stdlib";\nFileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("ignores FileAttachment if a comma expression", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\n(1, FileAttachment)("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, '(1, FileAttachment)("./test.txt")');
  });
  it("ignores FileAttachment if not imported from @observablehq/stdlib", async () => {
    const input = 'import {FileAttachment} from "@observablehq/not-stdlib";\nFileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("rewrites FileAttachment when aliased", async () => {
    const input = 'import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'F("../test.txt", import.meta.url)');
  });
  it("rewrites FileAttachment when aliased to a global", async () => {
    const input = 'import {FileAttachment as File} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'File("../test.txt", import.meta.url)');
  });
  it.skip("rewrites FileAttachment when imported as a namespace", async () => {
    const input = 'import * as O from "npm:@observablehq/stdlib";\nO.FileAttachment("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'O.FileAttachment("../test.txt", import.meta.url)');
  });
  it("ignores non-FileAttachment calls", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'File("./test.txt")');
  });
  it("rewrites single-quoted literals", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment('./test.txt')";
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("rewrites template-quoted literals", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(`./test.txt`)';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("throws a syntax error with non-literal calls", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment(`./${'test'}.txt`)";
    await assert.rejects(() => transpileModule(input, options), /FileAttachment requires a single literal string/); // prettier-ignore
  });
  it("throws a syntax error with URL fetches", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("https://example.com")';
    await assert.rejects(() => transpileModule(input, options), /non-local file path/); // prettier-ignore
  });
  it("ignores non-local path fetches", async () => {
    const input1 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../test.txt")';
    const input2 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../test.txt")';
    const input3 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../../test.txt")';
    const input4 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../../test.txt")';
    await assert.rejects(() => transpileModule(input1, options), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input2, options), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input3, {...options, path: "sub/test.js"}), /non-local file path/); // prettier-ignore
    await assert.rejects(() => transpileModule(input4, {...options, path: "sub/test.js"}), /non-local file path/); // prettier-ignore
  });
});
