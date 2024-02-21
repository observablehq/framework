import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {FilePath} from "../../src/brandedPath.js";
import {findFeatures} from "../../src/javascript/features.js";
import {findReferences} from "../../src/javascript/references.js";

describe("findFeatures(node, path, references, input)", () => {
  it("finds FileAttachment", () => {
    assert.deepStrictEqual(features('FileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]);
  });
  it("finds imported FileAttachment", () => {
    assert.deepStrictEqual(features('import {FileAttachment} from "npm:@observablehq/stdlib";\nFileAttachment("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]); // prettier-ignore
    assert.deepStrictEqual(features('import {FileAttachment as F} from "npm:@observablehq/stdlib";\nF("foo.json")'), [{type: "FileAttachment", name: "foo.json"}]); // prettier-ignore
  });
});

function features(input) {
  const node = parse(input);
  return findFeatures(node, FilePath("index.js"), findReferences(node), input);
}

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
