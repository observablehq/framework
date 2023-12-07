import assert from "node:assert";
import type {Node, Program} from "acorn";
import {Parser} from "acorn";
import {ascending} from "d3-array";
import {getFeatureReferenceMap, parseLocalImports, rewriteModule} from "../../src/javascript/imports.js";
import type {Feature, ImportReference} from "../../src/javascript.js";

describe("parseLocalImports(root, paths)", () => {
  it("finds all local imports in one file", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/imports", ["foo/foo.js"]).imports.sort(order), [
      {name: "npm:d3", type: "global"},
      {name: "bar/bar.js", type: "local"},
      {name: "bar/baz.js", type: "local"},
      {name: "foo/foo.js", type: "local"},
      {name: "top.js", type: "local"}
    ]);
  });
  it("finds all local imports in multiple files", () => {
    assert.deepStrictEqual(
      parseLocalImports("test/input/imports", ["transitive-static-import.js", "dynamic-import.js"]).imports.sort(order),
      [
        {name: "bar.js", type: "local"},
        {name: "dynamic-import.js", type: "local"},
        {name: "other/foo.js", type: "local"},
        {name: "transitive-static-import.js", type: "local"}
      ]
    );
  });
  it("ignores missing files", () => {
    assert.deepStrictEqual(
      parseLocalImports("test/input/imports", ["static-import.js", "does-not-exist.js"]).imports.sort(order),
      [
        {name: "bar.js", type: "local"},
        {name: "does-not-exist.js", type: "local"},
        {name: "static-import.js", type: "local"}
      ]
    );
  });
  it("find all local fetches in one file", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["foo/foo.js"]).features.sort(order), [
      {name: "foo/foo-data.csv", type: "FileAttachment"},
      {name: "foo/foo-data.json", type: "FileAttachment"}
    ]);
  });
  it("find all local fetches via transitive import", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["top.js"]).features.sort(order), [
      {name: "foo/foo-data.csv", type: "FileAttachment"},
      {name: "foo/foo-data.json", type: "FileAttachment"},
      {name: "top-data.csv", type: "FileAttachment"},
      {name: "top-data.json", type: "FileAttachment"}
    ]);
  });
});

describe("findImportFeatureReferences(node)", () => {
  it("finds the import declaration", () => {
    const node = parse('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("file.txt");');
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), [
      {type: "Identifier", name: "FileAttachment", start: 57, end: 71}
    ]);
  });
  it("finds the import declaration if aliased", () => {
    const node = parse('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("file.txt");');
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), [
      {type: "Identifier", name: "F", start: 62, end: 63}
    ]);
  });
  it("finds the import declaration if aliased and masking a global", () => {
    const node = parse('import {FileAttachment as File} from "npm:@observablehq/stdlib";\nFile("file.txt");');
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), [
      {type: "Identifier", name: "File", start: 65, end: 69}
    ]);
  });
  it("finds the import declaration if multiple aliases", () => {
    const node = parse('import {FileAttachment as F, FileAttachment as G} from "npm:@observablehq/stdlib";\nF("file.txt");\nG("file.txt");'); // prettier-ignore
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), [
      {type: "Identifier", name: "F", start: 83, end: 84},
      {type: "Identifier", name: "G", start: 98, end: 99}
    ]);
  });
  it("ignores import declarations from another module", () => {
    const node = parse('import {FileAttachment as F} from "npm:@observablehq/not-stdlib";\nF("file.txt");');
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), []);
  });
  it.skip("supports namespace imports", () => {
    const node = parse('import * as O from "npm:@observablehq/stdlib";\nO.FileAttachment("file.txt");');
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), [
      {type: "Identifier", name: "FileAttachment", start: 49, end: 63}
    ]);
  });
  it("ignores masked references", () => {
    const node = parse('import {FileAttachment} from "npm:@observablehq/stdlib";\n((FileAttachment) => FileAttachment("file.txt"))(String);'); // prettier-ignore
    assert.deepStrictEqual(Array.from(getFeatureReferenceMap(node).keys(), object), []);
  });
});

async function testFile(target: string, path: string): Promise<string> {
  const input = `import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(${JSON.stringify(target)})`;
  const output = await rewriteModule(input, path, async (path, specifier) => specifier);
  return output.split("\n").pop()!;
}

describe("rewriteModule(input, path, resolver)", () => {
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
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, '((FileAttachment) => FileAttachment("./test.txt"))(eval)');
  });
  it("ignores FileAttachment if not imported", async () => {
    const input = 'import {Generators} from "npm:@observablehq/stdlib";\nFileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("ignores FileAttachment if a comma expression", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\n(1, FileAttachment)("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, '(1, FileAttachment)("./test.txt")');
  });
  it("ignores FileAttachment if not imported from @observablehq/stdlib", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/not-stdlib";\nFileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("rewrites FileAttachment when aliased", async () => {
    const input = 'import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'F("../test.txt", import.meta.url)');
  });
  it("rewrites FileAttachment when aliased to a global", async () => {
    const input = 'import {FileAttachment as File} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'File("../test.txt", import.meta.url)');
  });
  it.skip("rewrites FileAttachment when imported as a namespace", async () => {
    const input = 'import * as O from "npm:@observablehq/stdlib";\nO.FileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'O.FileAttachment("../test.txt", import.meta.url)');
  });
  it("ignores non-FileAttachment calls", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'File("./test.txt")');
  });
  it("rewrites single-quoted literals", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment('./test.txt')";
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("rewrites template-quoted literals", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(`./test.txt`)';
    const output = (await rewriteModule(input, "test.js", async (path, specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("throws a syntax error with non-literal calls", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment(`./${'test'}.txt`)";
    await assert.rejects(() => rewriteModule(input, "test.js", async (path, specifier) => specifier), /FileAttachment requires a single literal string/); // prettier-ignore
  });
  it("throws a syntax error with URL fetches", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("https://example.com")';
    await assert.rejects(() => rewriteModule(input, "test.js", async (path, specifier) => specifier), /non-local file path/); // prettier-ignore
  });
  it("ignores non-local path fetches", async () => {
    const input1 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../test.txt")';
    const input2 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../test.txt")';
    const input3 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../../test.txt")';
    const input4 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../../test.txt")';
    await assert.rejects(() => rewriteModule(input1, "test.js", async (path, specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input2, "test.js", async (path, specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input3, "sub/test.js", async (path, specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input4, "sub/test.js", async (path, specifier) => specifier), /non-local file path/); // prettier-ignore
  });
});

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}

function object(node: Node) {
  return {...node};
}

function order(a: ImportReference | Feature, b: ImportReference | Feature): number {
  return ascending(a.type, b.type) || ascending(a.name, b.name);
}
