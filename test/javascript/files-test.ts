import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findFiles} from "../../src/javascript/files.js";

// prettier-ignore
describe("findFiles(node, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", path: "foo.json", method: "json"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(files('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{name: "foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{name: "foo.json", path: "foo.json", method: "json"}]);
  });
  it("allows relative paths", () => {
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', "data/bar.js"), [{name: "./foo.json", path: "data/foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("../foo.json")', "data/bar.js"), [{name: "../foo.json", path: "foo.json", method: "json"}]);
  });
  it("allows absolute paths", () => {
    assert.deepStrictEqual(files('FileAttachment("/foo.json")'), [{name: "/foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo/bar.json")'), [{name: "/foo/bar.json", path: "foo/bar.json", method: "json"}]);
  });
  it("allows double-quoted literals", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", path: "foo.json", method: "json"}]);
  });
  it("allows single-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment('foo.json')"), [{name: "foo.json", path: "foo.json", method: "json"}]);
  });
  it("allows template-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment(`foo.json`)"), [{name: "foo.json", path: "foo.json", method: "json"}]);
  });
  it("disallows multiple arguments", () => {
    assert.throws(() => files("FileAttachment('foo.json', false)"), /requires a single argument/);
  });
  it("disallows non-string arguments", () => {
    assert.throws(() => files("FileAttachment(42)"), /requires a literal string argument/);
  });
  it("disallows dynamic arguments", () => {
    assert.throws(() => files("FileAttachment(`${42}`)"), /requires a literal string argument/);
    assert.throws(() => files("FileAttachment('foo' + 42 + '.json')"), /requires a literal string argument/);
  });
  it("resolves the path relative to the source", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")', "bar.js"), [{name: "foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', "bar.js"), [{name: "./foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo.json")', "bar.js"), [{name: "/foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("data/foo.json")', "bar.js"), [{name: "data/foo.json", path: "data/foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.json")', "data/bar.js"), [{name: "foo.json", path: "data/foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', "data/bar.js"), [{name: "./foo.json", path: "data/foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("../foo.json")', "data/bar.js"), [{name: "../foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo.json")', "data/bar.js"), [{name: "/foo.json", path: "foo.json", method: "json"}]);
  });
  it("disallows paths outside the source root", () => {
    assert.throws(() => files('FileAttachment("../foo.json")', "bar.js"), /non-local file path/);
    assert.throws(() => files('FileAttachment("../../foo.json")', "data/bar.js"), /non-local file path/);
    assert.throws(() => files('FileAttachment("/../foo.json")', "bar.js"), /non-local file path/);
    assert.throws(() => files('FileAttachment("/../foo.json")', "data/bar.js"), /non-local file path/);
  });
  it("disallows non-paths", () => {
    assert.throws(() => files('FileAttachment("https://example.com/foo.json")'), /non-local file path/);
    assert.throws(() => files('FileAttachment("#foo.json")'), /non-local file path/);
  });
  it("sets the file method based on the member expression", () => {
    assert.deepStrictEqual(files('FileAttachment("foo").arrayBuffer'), [{name: "foo", path: "foo", method: "arrayBuffer"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{name: "foo", path: "foo", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{name: "foo", path: "foo", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").blob'), [{name: "foo", path: "foo", method: "blob"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").csv'), [{name: "foo", path: "foo", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").html'), [{name: "foo", path: "foo", method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").image'), [{name: "foo", path: "foo", method: "image"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").json'), [{name: "foo", path: "foo", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").parquet'), [{name: "foo", path: "foo", method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").sqlite'), [{name: "foo", path: "foo", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").stream'), [{name: "foo", path: "foo", method: "stream"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").text'), [{name: "foo", path: "foo", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").tsv'), [{name: "foo", path: "foo", method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xlsx'), [{name: "foo", path: "foo", method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xml'), [{name: "foo", path: "foo", method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").zip'), [{name: "foo", path: "foo", method: "zip"}]);
  });
  it("otherwise sets the file method based on the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.arrow")'), [{name: "foo.arrow", path: "foo.arrow", method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv")'), [{name: "foo.csv", path: "foo.csv", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.db")'), [{name: "foo.db", path: "foo.db", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.html")'), [{name: "foo.html", path: "foo.html", method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{name: "foo.json", path: "foo.json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.parquet")'), [{name: "foo.parquet", path: "foo.parquet", method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.sqlite")'), [{name: "foo.sqlite", path: "foo.sqlite", method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.tsv")'), [{name: "foo.tsv", path: "foo.tsv", method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt")'), [{name: "foo.txt", path: "foo.txt", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xlsx")'), [{name: "foo.xlsx", path: "foo.xlsx", method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xml")'), [{name: "foo.xml", path: "foo.xml", method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.zip")'), [{name: "foo.zip", path: "foo.zip", method: "zip"}]);
  });
  it("the file method takes priority over the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.txt").csv'), [{name: "foo.txt", path: "foo.txt", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt").json'), [{name: "foo.txt", path: "foo.txt", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").text'), [{name: "foo.csv", path: "foo.csv", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").json'), [{name: "foo.csv", path: "foo.csv", method: "json"}]);
  });
});

function files(input: string, path = "index.js") {
  return findFiles(parse(input), path, input).map((f) => (delete (f as any).node, f));
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
