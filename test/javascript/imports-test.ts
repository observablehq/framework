import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findExports, hasImportDeclaration} from "../../src/javascript/imports.js";
// import {isLocalImport, rewriteModule} from "../../src/javascript/imports.js";
import {resolvePath} from "../../src/path.js";

describe("isLocalImport", () => {
  it("identifies a local import", async () => {
    const root = "docs";
    const sourcePath = "/hello.md";
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, importValue), "./docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("relative paths are correctly handled", async () => {
    const root = "docs";
    const sourcePath = "/subDocs/hello.md";
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, importValue), "./docs/subDocs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("root and sourcePath arguments can correctly handle slashes", async () => {
    const root = "docs/";
    const sourcePath = "/hello.md/";
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, importValue), "./docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("identifies a local import from a nested sourcePath", async () => {
    const root = "docs";
    const sourcePath = "/subDocs/subDocs2/hello.md";
    const importValue = "../../random.js";
    assert.equal(resolvePath(root, sourcePath, importValue), "./docs/random.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("cannot go to an ancestor directory beyond the root", async () => {
    const root = "docs";
    const sourcePath = "/hello.md";
    const importValue1 = "../../../random.js";
    assert.equal(resolvePath(root, sourcePath, importValue1), "../../random.js");
    assert.equal(isLocalImport(importValue1, sourcePath), false);
    const importValue2 = "./../../random.js";
    assert.equal(resolvePath(root, sourcePath, importValue2), "../random.js");
    assert.equal(isLocalImport(importValue2, sourcePath), false);
    const importValue3 = "/../random.js";
    assert.equal(resolvePath(root, sourcePath, importValue3), "./random.js");
    assert.equal(isLocalImport(importValue3, sourcePath), false);
  });
});

describe("findExports(body)", () => {
  it("finds export all declarations", () => {
    const program = parse("export * from 'foo.js';\nexport * from 'bar.js';");
    assert.deepStrictEqual(findExports(program), program.body);
  });
  it("finds named export declarations", () => {
    const program = parse("export {foo} from 'foo.js';\nexport const bar = 2;");
    assert.deepStrictEqual(findExports(program), program.body);
  });
  it("returns the empty array if there are no exports", () => {
    assert.deepStrictEqual(findExports(parse("1 + 2;")), []);
  });
});

describe("hasImportDeclaration(body)", () => {
  it("returns true if the body has import declarations", () => {
    assert.strictEqual(hasImportDeclaration(parse("import 'foo.js';")), true);
  });
  it("returns false if the body does not have import declarations", () => {
    assert.strictEqual(hasImportDeclaration(parse("1 + 2;")), false);
    assert.strictEqual(hasImportDeclaration(parse("import('foo.js');")), false);
  });
});

// describe("parseLocalImports(root, paths)", () => {
//   it("finds all local imports in one file", () => {
//     assert.deepStrictEqual(parseLocalImports("test/input/build/imports", ["foo/foo.js"]).imports, [
//       {name: "foo/foo.js", type: "local"},
//       {name: "npm:d3", type: "global"},
//       {name: "bar/bar.js", type: "local"},
//       {name: "top.js", type: "local"},
//       {name: "bar/baz.js", type: "local"}
//     ]);
//   });
//   it("finds all local imports in multiple files", () => {
//     assert.deepStrictEqual(
//       parseLocalImports("test/input/imports", ["transitive-static-import.js", "dynamic-import.js"]).imports,
//       [
//         {name: "transitive-static-import.js", type: "local"},
//         {name: "dynamic-import.js", type: "local"},
//         {name: "other/foo.js", type: "local"},
//         {name: "bar.js", type: "local"}
//       ]
//     );
//   });
//   it("ignores missing files", () => {
//     assert.deepStrictEqual(parseLocalImports("test/input/imports", ["static-import.js", "does-not-exist.js"]).imports, [
//       {name: "static-import.js", type: "local"},
//       {name: "does-not-exist.js", type: "local"},
//       {name: "bar.js", type: "local"}
//     ]);
//   });
//   it("find all local fetches in one file", () => {
//     assert.deepStrictEqual(
//       parseLocalImports("test/input/build/fetches", ["foo/foo.js"]).files.map(({node, ...f}) => f),
//       [
//         {path: "foo/foo-data.json", mimeType: "application/json", method: "json"},
//         {path: "foo/foo-data.csv", mimeType: "text/csv", method: "text"}
//       ]
//     );
//   });
//   it("find all local fetches via transitive import", () => {
//     assert.deepStrictEqual(
//       parseLocalImports("test/input/build/fetches", ["top.js"]).files.map(({node, ...f}) => f),
//       [
//         {path: "top-data.json", mimeType: "application/json", method: "json"},
//         {path: "top-data.csv", mimeType: "text/csv", method: "text"},
//         {path: "foo/foo-data.json", mimeType: "application/json", method: "json"},
//         {path: "foo/foo-data.csv", mimeType: "text/csv", method: "text"}
//       ]
//     );
//   });
// });

async function testFile(target: string, path: string): Promise<string> {
  const input = `import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(${JSON.stringify(target)})`;
  const output = await rewriteModule(input, path, async (specifier) => specifier);
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
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, '((FileAttachment) => FileAttachment("./test.txt"))(eval)');
  });
  it("ignores FileAttachment if not imported", async () => {
    const input = 'import {Generators} from "npm:@observablehq/stdlib";\nFileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("ignores FileAttachment if a comma expression", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\n(1, FileAttachment)("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, '(1, FileAttachment)("./test.txt")');
  });
  it("ignores FileAttachment if not imported from @observablehq/stdlib", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/not-stdlib";\nFileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("./test.txt")');
  });
  it("rewrites FileAttachment when aliased", async () => {
    const input = 'import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'F("../test.txt", import.meta.url)');
  });
  it("rewrites FileAttachment when aliased to a global", async () => {
    const input = 'import {FileAttachment as File} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'File("../test.txt", import.meta.url)');
  });
  it.skip("rewrites FileAttachment when imported as a namespace", async () => {
    const input = 'import * as O from "npm:@observablehq/stdlib";\nO.FileAttachment("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'O.FileAttachment("../test.txt", import.meta.url)');
  });
  it("ignores non-FileAttachment calls", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFile("./test.txt")';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'File("./test.txt")');
  });
  it("rewrites single-quoted literals", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment('./test.txt')";
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("rewrites template-quoted literals", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment(`./test.txt`)';
    const output = (await rewriteModule(input, "test.js", async (specifier) => specifier)).split("\n").pop()!;
    assert.strictEqual(output, 'FileAttachment("../test.txt", import.meta.url)');
  });
  it("throws a syntax error with non-literal calls", async () => {
    const input = "import {FileAttachment} from \"npm:@observablehq/stdlib\";\nFileAttachment(`./${'test'}.txt`)";
    await assert.rejects(() => rewriteModule(input, "test.js", async (specifier) => specifier), /FileAttachment requires a single literal string/); // prettier-ignore
  });
  it("throws a syntax error with URL fetches", async () => {
    const input = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("https://example.com")';
    await assert.rejects(() => rewriteModule(input, "test.js", async (specifier) => specifier), /non-local file path/); // prettier-ignore
  });
  it("ignores non-local path fetches", async () => {
    const input1 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../test.txt")';
    const input2 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../test.txt")';
    const input3 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("../../test.txt")';
    const input4 = 'import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("./../../test.txt")';
    await assert.rejects(() => rewriteModule(input1, "test.js", async (specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input2, "test.js", async (specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input3, "sub/test.js", async (specifier) => specifier), /non-local file path/); // prettier-ignore
    await assert.rejects(() => rewriteModule(input4, "sub/test.js", async (specifier) => specifier), /non-local file path/); // prettier-ignore
  });
});

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
