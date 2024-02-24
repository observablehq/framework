import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findFileAttachments} from "../../src/javascript/files.js";

// prettier-ignore
describe("findFileAttachments(node, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(files('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("allows relative paths", () => {
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', {path: "data/bar.js"}), [{path: "data/foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("../foo.json")', {path: "data/bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("allows absolute paths", () => {
    assert.deepStrictEqual(files('FileAttachment("/foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo/bar.json")'), [{path: "foo/bar.json", mimeType: "application/json", method: "json"}]);
  });
  it("allows double-quoted literals", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("allows single-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment('foo.json')"), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("allows template-quoted literals", () => {
    assert.deepStrictEqual(files("FileAttachment(`foo.json`)"), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("disallows multiple arguments", () => {
    assert.throws(() => files("FileAttachment('foo.json', false)"), /requires a single literal string argument/);
  });
  it("disallows non-string arguments", () => {
    assert.throws(() => files("FileAttachment(42)"), /requires a single literal string argument/);
  });
  it("disallows dynamic arguments", () => {
    assert.throws(() => files("FileAttachment(`${42}`)"), /requires a single literal string argument/);
    assert.throws(() => files("FileAttachment('foo' + 42 + '.json')"), /requires a single literal string argument/);
  });
  it("resolves the path relative to the source", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.json")', {path: "bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', {path: "bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo.json")', {path: "bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("data/foo.json")', {path: "bar.js"}), [{path: "data/foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.json")', {path: "data/bar.js"}), [{path: "data/foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("./foo.json")', {path: "data/bar.js"}), [{path: "data/foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("../foo.json")', {path: "data/bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("/foo.json")', {path: "data/bar.js"}), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
  });
  it("disallows paths outside the source root", () => {
    assert.throws(() => files('FileAttachment("../foo.json")', {path: "bar.js"}), /non-local file path/);
    assert.throws(() => files('FileAttachment("../../foo.json")', {path: "data/bar.js"}), /non-local file path/);
    assert.throws(() => files('FileAttachment("/../foo.json")', {path: "bar.js"}), /non-local file path/);
    assert.throws(() => files('FileAttachment("/../foo.json")', {path: "data/bar.js"}), /non-local file path/);
  });
  it("disallows non-paths", () => {
    assert.throws(() => files('FileAttachment("https://example.com/foo.json")'), /non-local file path/);
    assert.throws(() => files('FileAttachment("#foo.json")'), /non-local file path/);
  });
  it("sets the file method based on the member expression", () => {
    assert.deepStrictEqual(files('FileAttachment("foo").arrayBuffer'), [{path: "foo", mimeType: null, method: "arrayBuffer"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{path: "foo", mimeType: null, method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").arrow'), [{path: "foo", mimeType: null, method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").blob'), [{path: "foo", mimeType: null, method: "blob"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").csv'), [{path: "foo", mimeType: null, method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").html'), [{path: "foo", mimeType: null, method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").image'), [{path: "foo", mimeType: null, method: "image"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").json'), [{path: "foo", mimeType: null, method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").parquet'), [{path: "foo", mimeType: null, method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").sqlite'), [{path: "foo", mimeType: null, method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").stream'), [{path: "foo", mimeType: null, method: "stream"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").text'), [{path: "foo", mimeType: null, method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").tsv'), [{path: "foo", mimeType: null, method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xlsx'), [{path: "foo", mimeType: null, method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").xml'), [{path: "foo", mimeType: null, method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo").zip'), [{path: "foo", mimeType: null, method: "zip"}]);
  });
  it("otherwise sets the file method based on the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.arrow")'), [{path: "foo.arrow", mimeType: null, method: "arrow"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv")'), [{path: "foo.csv", mimeType: "text/csv", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.db")'), [{path: "foo.db", mimeType: null, method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.html")'), [{path: "foo.html", mimeType: "text/html", method: "html"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.json")'), [{path: "foo.json", mimeType: "application/json", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.parquet")'), [{path: "foo.parquet", mimeType: null, method: "parquet"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.sqlite")'), [{path: "foo.sqlite", mimeType: null, method: "sqlite"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.tsv")'), [{path: "foo.tsv", mimeType: "text/tab-separated-values", method: "tsv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt")'), [{path: "foo.txt", mimeType: "text/plain", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xlsx")'), [{path: "foo.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", method: "xlsx"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.xml")'), [{path: "foo.xml", mimeType: "application/xml", method: "xml"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.zip")'), [{path: "foo.zip", mimeType: "application/zip", method: "zip"}]);
  });
  it("the file method takes priority over the file extension", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.txt").csv'), [{path: "foo.txt", mimeType: "text/plain", method: "csv"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.txt").json'), [{path: "foo.txt", mimeType: "text/plain", method: "json"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").text'), [{path: "foo.csv", mimeType: "text/csv", method: "text"}]);
    assert.deepStrictEqual(files('FileAttachment("foo.csv").json'), [{path: "foo.csv", mimeType: "text/csv", method: "json"}]);
  });
  it("respects the given aliases", () => {
    assert.deepStrictEqual(files('FileAttachment("foo.txt").csv', {aliases: []}), []);
    assert.deepStrictEqual(files('File("foo.txt").csv', {aliases: ["File"]}), [{path: "foo.txt", mimeType: "text/plain", method: "csv"}]);
  });
  it("finds the import declaration", () => {
    assert.deepStrictEqual(files('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.txt").csv', {aliases: []}), [{path: "foo.txt", mimeType: "text/plain", method: "csv"}]);
  });
  it("finds the import declaration if aliased", () => {
    assert.deepStrictEqual(files('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.txt").csv', {aliases: []}), [{path: "foo.txt", mimeType: "text/plain", method: "csv"}]);
  });
  it("finds the import declaration if aliased and masking a global", () => {
    assert.deepStrictEqual(files('import {FileAttachment as File} from "npm:@observablehq/stdlib";\nFile("foo.txt").csv', {aliases: []}), [{path: "foo.txt", mimeType: "text/plain", method: "csv"}]);
  });
  it("finds the import declaration if multiple aliases", () => {
    assert.deepStrictEqual(files('import {FileAttachment as F, FileAttachment as G} from "npm:@observablehq/stdlib";\nF("file1.txt");\nG("file2.txt");', {aliases: []}), [{path: "file1.txt", mimeType: "text/plain", method: "text"}, {path: "file2.txt", mimeType: "text/plain", method: "text"}]);
  });
  it("ignores import declarations from another module", () => {
    assert.deepStrictEqual(files('import {FileAttachment as F} from "npm:@observablehq/not-stdlib";\nFileAttachment("file1.txt");', {aliases: []}), []);
  });
  it.skip("supports namespace imports", () => {
    assert.deepStrictEqual(files('import * as O from "npm:@observablehq/stdlib";\nO.FileAttachment("foo.txt");', {aliases: []}), [{path: "foo.txt", mimeType: "text/plain", method: "text"}]);
  });
  it("ignores masked references", () => {
    assert.deepStrictEqual(files('import {FileAttachment} from "npm:@observablehq/stdlib";\n((FileAttachment) => FileAttachment("file.txt"))(String);', {aliases: []}), []);
  });
});

function files(input: string, {path = "index.md", aliases = ["FileAttachment"]} = {}) {
  return findFileAttachments(parse(input), path, input, aliases).map(({node, ...f}) => f);
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
