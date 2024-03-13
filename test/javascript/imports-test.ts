import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findExports, findImports, hasImportDeclaration} from "../../src/javascript/imports.js";

describe("findExports(body)", () => {
  it("finds export all declarations", () => {
    const program = parse("export * from 'foo.js';\nexport * from 'bar.js';\n");
    assert.deepStrictEqual(findExports(program), program.body);
  });
  it("finds named export declarations", () => {
    const program = parse("export {foo} from 'foo.js';\nexport const bar = 2;\n");
    assert.deepStrictEqual(findExports(program), program.body);
  });
  it("returns the empty array if there are no exports", () => {
    assert.deepStrictEqual(findExports(parse("1 + 2;\n")), []);
  });
});

describe("findImports(body, path, input)", () => {
  it("finds local static import declarations", () => {
    const input = "import {foo} from './bar.js';\nimport '/baz.js';\nimport def from '../qux.js';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "./bar.js", type: "local", method: "static"},
      {name: "../baz.js", type: "local", method: "static"},
      {name: "../qux.js", type: "local", method: "static"}
    ]);
  });
  it("finds local static import expressions", () => {
    const input = "import('./bar.js');\nimport('/baz.js');\nimport('../qux.js');\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "./bar.js", type: "local", method: "dynamic"},
      {name: "../baz.js", type: "local", method: "dynamic"},
      {name: "../qux.js", type: "local", method: "dynamic"}
    ]);
  });
  it("finds local static export all declarations", () => {
    const input = "export * from './bar.js';\nexport * from '/baz.js';\nexport * from '../qux.js';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "./bar.js", type: "local", method: "static"},
      {name: "../baz.js", type: "local", method: "static"},
      {name: "../qux.js", type: "local", method: "static"}
    ]);
  });
  it("finds local static export named declarations", () => {
    const input =
      "export {foo} from './bar.js';\nexport {default as def} from '/baz.js';\nexport {} from '../qux.js';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "./bar.js", type: "local", method: "static"},
      {name: "../baz.js", type: "local", method: "static"},
      {name: "../qux.js", type: "local", method: "static"}
    ]);
  });
  it("finds global static import declarations", () => {
    const input = "import {foo} from 'bar.js';\nimport '@observablehq/baz';\nimport def from 'npm:qux';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "bar.js", type: "global", method: "static"},
      {name: "@observablehq/baz", type: "global", method: "static"},
      {name: "npm:qux", type: "global", method: "static"}
    ]);
  });
  it("finds global static import expressions", () => {
    const input = "import('bar.js');\nimport('@observablehq/baz');\nimport('npm:qux');\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "bar.js", type: "global", method: "dynamic"},
      {name: "@observablehq/baz", type: "global", method: "dynamic"},
      {name: "npm:qux", type: "global", method: "dynamic"}
    ]);
  });
  it("finds global static export all declarations", () => {
    const input = "export * from 'bar.js';\nexport * from '@observablehq/baz';\nexport * from 'npm:qux';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "bar.js", type: "global", method: "static"},
      {name: "@observablehq/baz", type: "global", method: "static"},
      {name: "npm:qux", type: "global", method: "static"}
    ]);
  });
  it("finds global static export named declarations", () => {
    const input =
      "export {foo} from 'bar.js';\nexport {default as def} from '@observablehq/baz';\nexport {} from 'npm:qux';\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), [
      {name: "bar.js", type: "global", method: "static"},
      {name: "@observablehq/baz", type: "global", method: "static"},
      {name: "npm:qux", type: "global", method: "static"}
    ]);
  });
  it("ignores import expressions with dynamic sources", () => {
    const input = "import('./bar'+'.js');\nimport(`/${'baz'}.js`);\n";
    const program = parse(input);
    assert.deepStrictEqual(findImports(program, "foo/bar.js", input), []);
  });
  it("errors on non-local paths", () => {
    const input = "import('../bar.js');\n";
    const program = parse(input);
    assert.throws(() => findImports(program, "foo.js", input), /non-local import/);
  });
});

describe("hasImportDeclaration(body)", () => {
  it("returns true if the body has import declarations", () => {
    assert.strictEqual(hasImportDeclaration(parse("import 'foo.js';")), true);
  });
<<<<<<< HEAD
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
    assert.strictEqual(output, '((FileAttachment2) => FileAttachment2("./test.txt"))(eval)');
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
=======
  it("returns false if the body does not have import declarations", () => {
    assert.strictEqual(hasImportDeclaration(parse("1 + 2;")), false);
    assert.strictEqual(hasImportDeclaration(parse("import('foo.js');")), false);
>>>>>>> main
  });
});

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
