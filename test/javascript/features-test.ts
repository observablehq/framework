import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findFeatures} from "../../src/javascript/features.js";
import {findReferences} from "../../src/javascript/references.js";

// prettier-ignore
describe("findFeatures(node, path, references, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(features('FileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json", method: "json"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(features('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json", method: "json"}]);
    assert.deepStrictEqual(features('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{type: "FileAttachment", name: "foo.json", method: "json"}]);
  });
  it("sets the file method based on the member expression", () => {
    assert.deepStrictEqual(features('FileAttachment("foo").arrayBuffer'), [{type: "FileAttachment", name: "foo", method: "arrayBuffer"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").arrow'), [{type: "FileAttachment", name: "foo", method: "arrow"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").arrow'), [{type: "FileAttachment", name: "foo", method: "arrow"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").blob'), [{type: "FileAttachment", name: "foo", method: "blob"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").csv'), [{type: "FileAttachment", name: "foo", method: "csv"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").html'), [{type: "FileAttachment", name: "foo", method: "html"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").image'), [{type: "FileAttachment", name: "foo", method: "image"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").json'), [{type: "FileAttachment", name: "foo", method: "json"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").parquet'), [{type: "FileAttachment", name: "foo", method: "parquet"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").sqlite'), [{type: "FileAttachment", name: "foo", method: "sqlite"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").stream'), [{type: "FileAttachment", name: "foo", method: "stream"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").text'), [{type: "FileAttachment", name: "foo", method: "text"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").tsv'), [{type: "FileAttachment", name: "foo", method: "tsv"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").xlsx'), [{type: "FileAttachment", name: "foo", method: "xlsx"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").xml'), [{type: "FileAttachment", name: "foo", method: "xml"}]);
    assert.deepStrictEqual(features('FileAttachment("foo").zip'), [{type: "FileAttachment", name: "foo", method: "zip"}]);
  });
  it("otherwise sets the file method based on the file extension", () => {
    assert.deepStrictEqual(features('FileAttachment("foo.arrow")'), [{type: "FileAttachment", name: "foo.arrow", method: "arrow"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.csv")'), [{type: "FileAttachment", name: "foo.csv", method: "csv"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.db")'), [{type: "FileAttachment", name: "foo.db", method: "sqlite"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.html")'), [{type: "FileAttachment", name: "foo.html", method: "html"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json", method: "json"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.parquet")'), [{type: "FileAttachment", name: "foo.parquet", method: "parquet"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.sqlite")'), [{type: "FileAttachment", name: "foo.sqlite", method: "sqlite"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.tsv")'), [{type: "FileAttachment", name: "foo.tsv", method: "tsv"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.txt")'), [{type: "FileAttachment", name: "foo.txt", method: "text"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.xlsx")'), [{type: "FileAttachment", name: "foo.xlsx", method: "xlsx"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.xml")'), [{type: "FileAttachment", name: "foo.xml", method: "xml"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.zip")'), [{type: "FileAttachment", name: "foo.zip", method: "zip"}]);
  });
  it("the file method takes priority over the file extension", () => {
    assert.deepStrictEqual(features('FileAttachment("foo.txt").csv'), [{type: "FileAttachment", name: "foo.txt", method: "csv"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.txt").json'), [{type: "FileAttachment", name: "foo.txt", method: "json"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.csv").text'), [{type: "FileAttachment", name: "foo.csv", method: "text"}]);
    assert.deepStrictEqual(features('FileAttachment("foo.csv").json'), [{type: "FileAttachment", name: "foo.csv", method: "json"}]);
  });
});

function features(input) {
  const node = parse(input);
  return findFeatures(node, "index.js", findReferences(node), input);
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
