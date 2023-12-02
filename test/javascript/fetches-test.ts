import assert from "node:assert";
import type {ArrowFunctionExpression, CallExpression, Identifier} from "acorn";
import {Parser} from "acorn";
import {ascending} from "d3-array";
import {rewriteIfLocalFetch} from "../../src/javascript/fetches.js";
import {parseLocalImports} from "../../src/javascript/imports.js";
import type {Feature} from "../../src/javascript.js";
import {Sourcemap} from "../../src/sourcemap.js";

describe("parseLocalFetches(root, paths)", () => {
  it("find all local fetches in one file", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["foo/foo.js"]).fetches.sort(compareImport), [
      {name: "./foo-data.csv", type: "FileAttachment"},
      {name: "./foo-data.json", type: "FileAttachment"}
    ]);
  });
  it("find all local fetches via transivite import", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["top.js"]).fetches.sort(compareImport), [
      {name: "./foo-data.csv", type: "FileAttachment"},
      {name: "./foo-data.json", type: "FileAttachment"},
      {name: "./top-data.csv", type: "FileAttachment"},
      {name: "./top-data.json", type: "FileAttachment"}
    ]);
  });
});

function testFetch(target: string, sourcePath: string, {meta = false} = {}): string {
  const input = `fetch(${JSON.stringify(target)})`;
  const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
  const output = new Sourcemap(input);
  rewriteIfLocalFetch(node, output, [], sourcePath, {meta});
  return String(output);
}

describe("rewriteIfLocalFetch(node, output, references, sourcePath, options)", () => {
  it("rewrites relative fetches without meta", () => {
    assert.strictEqual(testFetch("./test.txt", "test.js"), 'fetch("./_file/test.txt")');
    assert.strictEqual(testFetch("./sub/test.txt", "test.js"), 'fetch("./_file/sub/test.txt")');
    assert.strictEqual(testFetch("./test.txt", "sub/test.js"), 'fetch("../_file/sub/test.txt")');
    assert.strictEqual(testFetch("../test.txt", "sub/test.js"), 'fetch("../_file/test.txt")');
  });
  it("rewrites relative fetches with meta", () => {
    assert.strictEqual(testFetch("./test.txt", "test.js", {meta: true}), 'fetch(new URL("../_file/test.txt", import.meta.url))'); // prettier-ignore
    assert.strictEqual(testFetch("./sub/test.txt", "test.js", {meta: true}), 'fetch(new URL("../_file/sub/test.txt", import.meta.url))'); // prettier-ignore
    assert.strictEqual(testFetch("./test.txt", "sub/test.js", {meta: true}), 'fetch(new URL("../../_file/sub/test.txt", import.meta.url))'); // prettier-ignore
    assert.strictEqual(testFetch("../test.txt", "sub/test.js", {meta: true}), 'fetch(new URL("../../_file/test.txt", import.meta.url))'); // prettier-ignore
  });
  it("ignores fetches that don’t start with ./, ../, or /", () => {
    assert.strictEqual(testFetch("test.txt", "test.js"), 'fetch("test.txt")');
    assert.strictEqual(testFetch("sub/test.txt", "test.js"), 'fetch("sub/test.txt")');
    assert.strictEqual(testFetch("test.txt", "sub/test.js"), 'fetch("test.txt")');
    assert.strictEqual(testFetch("test.txt", "test.js", {meta: true}), 'fetch("test.txt")');
    assert.strictEqual(testFetch("sub/test.txt", "test.js", {meta: true}), 'fetch("sub/test.txt")');
    assert.strictEqual(testFetch("test.txt", "sub/test.js", {meta: true}), 'fetch("test.txt")');
  });
  it("rewrites absolute fetches without meta", () => {
    assert.strictEqual(testFetch("/test.txt", "test.js"), 'fetch("./_file/test.txt")');
    assert.strictEqual(testFetch("/sub/test.txt", "test.js"), 'fetch("./_file/sub/test.txt")');
    assert.strictEqual(testFetch("/test.txt", "sub/test.js"), 'fetch("../_file/test.txt")');
  });
  it("rewrites absolute fetches with meta", () => {
    assert.strictEqual(testFetch("/test.txt", "test.js", {meta: true}), 'fetch(new URL("../_file/test.txt", import.meta.url))'); // prettier-ignore
    assert.strictEqual(testFetch("/sub/test.txt", "test.js", {meta: true}), 'fetch(new URL("../_file/sub/test.txt", import.meta.url))'); // prettier-ignore
    assert.strictEqual(testFetch("/test.txt", "sub/test.js", {meta: true}), 'fetch(new URL("../../_file/test.txt", import.meta.url))'); // prettier-ignore
  });
  it("does not ignore fetch if not masked by a reference", () => {
    const input = '((fetch) => fetch("./test.txt"))(eval)';
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const call = (node.callee as ArrowFunctionExpression).body as CallExpression;
    assert.strictEqual(input.slice(call.start, call.end), 'fetch("./test.txt")');
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(call, output, [], "test.js");
    assert.strictEqual(String(output), '((fetch) => fetch("./_file/test.txt"))(eval)');
  });
  it("ignores fetch if masked by a reference", () => {
    const input = '((fetch) => fetch("./test.txt"))(eval)';
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const call = (node.callee as ArrowFunctionExpression).body as CallExpression;
    assert.strictEqual(input.slice(call.start, call.end), 'fetch("./test.txt")');
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(call, output, [call.callee as Identifier], "test.js");
    assert.strictEqual(String(output), input);
  });
  it("ignores non-identifier calls", () => {
    const input = 'window.fetch("./test.txt")';
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(node, output, [], "test.js");
    assert.strictEqual(String(output), input);
  });
  it("ignores non-fetch calls", () => {
    const input = 'fletch("./test.txt")';
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(node, output, [], "test.js");
    assert.strictEqual(String(output), input);
  });
  it("rewrites single-quoted literals", () => {
    const input = "fetch('./test.txt')";
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(node, output, [], "test.js");
    assert.strictEqual(String(output), 'fetch("./_file/test.txt")');
  });
  it("rewrites template-quoted literals", () => {
    const input = "fetch(`./test.txt`)";
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(node, output, [], "test.js");
    assert.strictEqual(String(output), 'fetch("./_file/test.txt")');
  });
  it("ignores non-literal calls", () => {
    const input = "fetch(`./${'test'}.txt`)";
    const node = Parser.parseExpressionAt(input, 0, {ecmaVersion: 13}) as CallExpression;
    const output = new Sourcemap(input);
    rewriteIfLocalFetch(node, output, [], "test.js");
    assert.strictEqual(String(output), input);
  });
  it("ignores URL fetches", () => {
    assert.strictEqual(testFetch("https://example.com", "test.js"), 'fetch("https://example.com")');
    assert.strictEqual(testFetch("https://example.com", "sub/test.js"), 'fetch("https://example.com")');
    assert.strictEqual(testFetch("https://example.com", "test.js", {meta: true}), 'fetch("https://example.com")');
    assert.strictEqual(testFetch("https://example.com", "sub/test.js", {meta: true}), 'fetch("https://example.com")');
  });
  it("ignores non-local path fetches", () => {
    assert.strictEqual(testFetch("../test.txt", "test.js"), 'fetch("../test.txt")');
    assert.strictEqual(testFetch("./../test.txt", "test.js"), 'fetch("./../test.txt")');
    assert.strictEqual(testFetch("../../test.txt", "sub/test.js"), 'fetch("../../test.txt")');
    assert.strictEqual(testFetch("./../../test.txt", "sub/test.js"), 'fetch("./../../test.txt")');
  });
});

function compareImport(a: Feature, b: Feature): number {
  return ascending(a.type, b.type) || ascending(a.name, b.name);
}
