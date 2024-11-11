import assert from "node:assert";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {checkAssignments} from "../../src/javascript/assignments.js";
import {findReferences} from "../../src/javascript/references.js";

describe("checkAssignments(node, references, input)", () => {
  it("disallows external assignments", () => {
    const input = "foo = 1;";
    const program = parse(input);
    const references = findReferences(program);
    assert.throws(() => checkAssignments(program, references, input), /external variable 'foo'/);
  });
  it("disallows global assignments", () => {
    const input = "Array = 1;";
    const program = parse(input);
    const references = findReferences(program);
    assert.throws(() => checkAssignments(program, references, input), /global 'Array'/);
  });
  it("allows local assignments", () => {
    const input = "let foo = 1;\nfoo = 2;";
    const program = parse(input);
    const references = findReferences(program);
    assert.strictEqual(checkAssignments(program, references, input), undefined);
  });
  it("allows member assignments", () => {
    const input = "window.foo = 1;";
    const program = parse(input);
    const references = findReferences(program);
    assert.strictEqual(checkAssignments(program, references, input), undefined);
  });
});

function parse(input: string): Program {
  return Parser.parse(input, {ecmaVersion: 13, sourceType: "module"});
}
