import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findFiles} from "../../src/javascript/files.js";

// prettier-ignore
describe("findFiles(node, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", method: "json"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(files('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{name: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{name: "foo.json", method: "json"}]);
  });
  it("allows relative paths", () => {
    assert.deepStrictEqual(files('FileAttachment("./foo.json")'), [{name: "./foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("../foo.json")'), [{name: "../foo.json", method: "json"}]);
  });
  it("allows absolute paths", () => {
    assert.deepStrictEqual(files('FileAttachment("/foo.json")'), [{name: "/foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo/bar.json")'), [{name: "/foo/bar.json", method: "json"}]);
  });
  it("allows double-quoted literals", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", method: "json"}]);
  });
  it("allows single-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment('foo.json')"), [{name: "foo.json", method: "json"}]);
  });
  it("allows template-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment(`foo.json`)"), [{name: "foo.json", method: "json"}]);
  });
  it("disallows non-string arguments", () => {
    assert.throws(() => files("FileAttachment(42)"), /requires a single literal string argument/);
  });
  it("disallows dynamic arguments", () => {
    assert.throws(() => files("FileAttachment(`${42}`)"), /requires a single literal string argument/);
    assert.throws(() => files("FileAttachment('foo' + 42 + '.json')"), /requires a single literal string argument/);
  });
  it("sets the file method based on the member expression", () => {
    assert.deepStrictEqual(files('FileAttachment("foo").arrayBuffer'), [{name: "foo", method: "arrayBuffer"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{name: "foo", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{name: "foo", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").blob'), [{name: "foo", method: "blob"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").csv'), [{name: "foo", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").html'), [{name: "foo", method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").image'), [{name: "foo", method: "image"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").json'), [{name: "foo", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").parquet'), [{name: "foo", method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").sqlite'), [{name: "foo", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").stream'), [{name: "foo", method: "stream"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").text'), [{name: "foo", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").tsv'), [{name: "foo", method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xlsx'), [{name: "foo", method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xml'), [{name: "foo", method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").zip'), [{name: "foo", method: "zip"}]);
  });
  it("otherwise sets the file method based on the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.arrow")'), [{name: "foo.arrow", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv")'), [{name: "foo.csv", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.db")'), [{name: "foo.db", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.html")'), [{name: "foo.html", method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.parquet")'), [{name: "foo.parquet", method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.sqlite")'), [{name: "foo.sqlite", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.tsv")'), [{name: "foo.tsv", method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt")'), [{name: "foo.txt", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xlsx")'), [{name: "foo.xlsx", method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xml")'), [{name: "foo.xml", method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.zip")'), [{name: "foo.zip", method: "zip"}]);
  });
  it("the file method takes priority over the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.txt").csv'), [{name: "foo.txt", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt").json'), [{name: "foo.txt", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").text'), [{name: "foo.csv", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").json'), [{name: "foo.csv", method: "json"}]);
  });
});

function files(input: string) {
  return findFiles(parse(input), input).map((f) => (delete (f as any).node, f));
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
