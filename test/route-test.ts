import assert from "node:assert";
import {route} from "../src/route.js";

describe("route(root, path, exts)", () => {
  it("finds an exact file", () => {
    assert.deepStrictEqual(route("test/input/build/simple", "simple", [".md"]), {path: "simple.md", ext: ".md"}); // prettier-ignore
  });
  it("finds an exact file with multiple extensions", () => {
    assert.deepStrictEqual(route("test/input/build/simple", "data", [".txt", ".txt.js", ".txt.py"]), {path: "data.txt.js", ext: ".txt.js"}); // prettier-ignore
  });
  it("finds a parameterized file", () => {
    assert.deepStrictEqual(route("test/input/params", "bar", [".md"]), {path: "[file].md", ext: ".md", params: {file: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "baz", [".md"]), {path: "[file].md", ext: ".md", params: {file: "baz"}}); // prettier-ignore
  });
  it("finds a parameterized file with multiple extensions", () => {
    assert.deepStrictEqual(route("test/input/params", "data", [".csv", ".csv.js", ".csv.py"]), {path: "[file].csv.js", ext: ".csv.js", params: {file: "data"}}); // prettier-ignore
  });
  it("finds a non-parameterized file ahead of a parameterized file", () => {
    assert.deepStrictEqual(route("test/input/params", "foo", [".md"]), {path: "foo.md", ext: ".md"}); // prettier-ignore
  });
  it("finds the most-specific parameterized match", () => {
    assert.deepStrictEqual(route("test/input/params", "foo/foo", [".md"]), {path: "foo/foo.md", ext: ".md"}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "foo/bar", [".md"]), {path: "foo/[file].md", ext: ".md", params: {file: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "foo/baz", [".md"]), {path: "foo/[file].md", ext: ".md", params: {file: "baz"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "bar/foo", [".md"]), {path: "[dir]/foo.md", ext: ".md", params: {dir: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "bar/bar", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "bar", file: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "bar/baz", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "bar", file: "baz"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "baz/foo", [".md"]), {path: "[dir]/foo.md", ext: ".md", params: {dir: "baz"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "baz/bar", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "baz", file: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "baz/baz", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "baz", file: "baz"}}); // prettier-ignore
  });
  it("returns undefined when there is no match", () => {
    assert.strictEqual(route("test/input/build/simple", "not-found", [".md"]), undefined);
    assert.strictEqual(route("test/input/build/simple", "simple", [".js"]), undefined);
    assert.strictEqual(route("test/input/params", "foo/bar/baz", [".md"]), undefined);
  });
  it("does not allow an empty match", () => {
    assert.deepStrictEqual(route("test/input/params", "foo/", [".md"]), undefined);
    assert.deepStrictEqual(route("test/input/params", "bar/", [".md"]), undefined);
  });
  it("does not allow the empty extension", () => {
    assert.throws(() => route("test/input/build/simple", "simple.md", [""]), /empty extension/);
    assert.throws(() => route("test/input/build/simple", "data.txt", ["", ".js", ".py"]), /empty extension/);
  });
});
