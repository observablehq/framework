import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {findFeatures} from "../../src/javascript/features.js";
import {findReferences} from "../../src/javascript/references.js";

describe("findFeatures(node, path, references, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(features('FileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]);
  });
  it("finds Secret", () => {
    assert.deepStrictEqual(features('Secret("foo")'), [{type: "Secret", name: "foo"}]);
  });
  it("finds DatabaseClient", () => {
    assert.deepStrictEqual(features('DatabaseClient("foo")'), [{type: "DatabaseClient", name: "foo"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(features('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]); // prettier-ignore
    assert.deepStrictEqual(features('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]); // prettier-ignore
  });
  it("finds imported DatabaseClient", () => {
    assert.deepStrictEqual(features('import {DatabaseClient} from "npm:@observablehq/stdlib";\nDatabaseClient("foo")'), [{type: "DatabaseClient", name: "foo"}]); // prettier-ignore
    assert.deepStrictEqual(features('import {DatabaseClient as D} from "npm:@observablehq/stdlib";\nD("foo")'), [{type: "DatabaseClient", name: "foo"}]); // prettier-ignore
  });
});

function features(input) {
  const node = parse(input);
  return findFeatures(node, "index.js", findReferences(node), input);
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
