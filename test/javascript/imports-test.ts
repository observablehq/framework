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
  it("returns false if the body does not have import declarations", () => {
    assert.strictEqual(hasImportDeclaration(parse("1 + 2;")), false);
    assert.strictEqual(hasImportDeclaration(parse("import('foo.js');")), false);
  });
});

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
