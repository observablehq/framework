import assert from "assert";
import {Sourcemap} from "../src/sourcemap.js";

describe("new Sourcemap(source)", () => {
  it("trivial", () => {
    const sm = new Sourcemap("");
    assert.strictEqual(sm.toString(), "");
    assert.deepStrictEqual(sm.translate({line: 1, column: 0}), {line: 1, column: 0});
  });
  it("insert at beginning", () => {
    const original = "hello;";
    const sm = new Sourcemap(original);
    sm.insertLeft(0, "return ");
    assert.strictEqual(sm.toString(), "return hello;");
    assert.deepStrictEqual(sm.translate({line: 1, column: 7}), {line: 1, column: 0});
  });
  it("insertLeft at beginning twice", () => {
    const original = "hello;";
    const sm = new Sourcemap(original);
    sm.insertLeft(0, " ");
    sm.insertLeft(0, "return");
    assert.strictEqual(sm.toString(), "return hello;");
    assert.deepStrictEqual(sm.translate({line: 1, column: 7}), {line: 1, column: 0});
  });
  it("insert right at beginning", () => {
    const original = "hello;";
    const sm = new Sourcemap(original);
    sm.insertLeft(0, "return");
    sm.insertRight(0, " ");
    assert.strictEqual(sm.toString(), "return hello;");
    assert.deepStrictEqual(sm.translate({line: 1, column: 7}), {line: 1, column: 0});
  });
  it("insert at end", () => {
    const original = "hello";
    const sm = new Sourcemap(original);
    sm.insertLeft(original.length, "();");
    assert.strictEqual(sm.toString(), "hello();");
    assert.deepStrictEqual(sm.translate({line: 1, column: 8}), {line: 1, column: 5});
  });
  it("insert at end twice is insertLeft", () => {
    const original = "hello";
    const sm = new Sourcemap(original);
    sm.insertLeft(original.length, ";");
    sm.insertLeft(original.length, "()");
    assert.strictEqual(sm.toString(), "hello();");
    assert.deepStrictEqual(sm.translate({line: 1, column: 8}), {line: 1, column: 5});
  });
  it("insert right at end", () => {
    const original = "hello";
    const sm = new Sourcemap(original);
    sm.insertLeft(original.length, "()");
    sm.insertRight(original.length, ";");
    assert.strictEqual(sm.toString(), "hello();");
    assert.deepStrictEqual(sm.translate({line: 1, column: 8}), {line: 1, column: 5});
  });
  it("insert new lines", () => {
    const original = "hello";
    const sm = new Sourcemap(original);
    sm.insertLeft(0, "function() {\n");
    sm.insertRight(original.length, "\n}");
    assert.strictEqual(sm.toString(), "function() {\nhello\n}");
    assert.deepStrictEqual(sm.translate({line: 1, column: 7}), {line: 1, column: 0});
    assert.deepStrictEqual(sm.translate({line: 2, column: 0}), {line: 1, column: 0});
    assert.deepStrictEqual(sm.translate({line: 3, column: 1}), {line: 1, column: 5});
  });
  it("replace new line", () => {
    const original = "\nhello";
    const sm = new Sourcemap(original);
    sm.replaceLeft(0, 1, "function() {\n");
    assert.strictEqual(sm.toString(), "function() {\nhello");
    assert.deepStrictEqual(sm.translate({line: 2, column: 0}), {line: 2, column: 0});
  });
  it("delete", () => {
    const original = "hello;";
    const sm = new Sourcemap(original);
    sm.delete(original.length - 1, original.length);
    assert.strictEqual(sm.toString(), "hello");
  });
  it("complete replace", () => {
    const original = "hello;";
    const sm = new Sourcemap(original);
    sm.replaceRight(0, original.length, "something else");
    assert.strictEqual(sm.toString(), "something else");
    assert.deepStrictEqual(sm.translate({line: 1, column: 0}), {line: 1, column: 0});
  });
  it("line-level granularity", () => {
    const sm = new Sourcemap("ab\ncd");
    sm.insertLeft(0, "foo");
    assert.deepStrictEqual(sm.translate({line: 1, column: 4}), {
      line: 1,
      column: 1
    });
  });
  it("trim", () => {
    const original = "\nhello;\n";
    const sm = new Sourcemap(original);
    sm.trim();
    assert.strictEqual(sm.toString(), "hello;");
  });
  it("replace a replacement", () => {
    const input = "FileAttachment(`${observable.params.foo}.json`)";
    const sourcemap = new Sourcemap(input);
    sourcemap.replaceLeft(18, 39, '"foo"');
    assert.strictEqual(sourcemap.toString(), 'FileAttachment(`${"foo"}.json`)');
    sourcemap.replaceLeft(15, 46, '"./foo.json"');
    assert.strictEqual(sourcemap.toString(), 'FileAttachment("./foo.json")');
  });
});
