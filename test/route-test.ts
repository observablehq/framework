import assert from "node:assert";
import {isParameterizedPath, route} from "../src/route.js";

describe("isParameterizedPath(path)", () => {
  it("returns true for a parameterized file name", () => {
    assert.strictEqual(isParameterizedPath("/[file].md"), true);
    assert.strictEqual(isParameterizedPath("/prefix-[file].md"), true);
    assert.strictEqual(isParameterizedPath("/[file]-suffix.md"), true);
    assert.strictEqual(isParameterizedPath("/[file]-[number].md"), true);
    assert.strictEqual(isParameterizedPath("/path/[file].md"), true);
    assert.strictEqual(isParameterizedPath("/path/to/[file].md"), true);
    assert.strictEqual(isParameterizedPath("/path/[dir]/[file].md"), true);
  });
  it("returns true for a parameterized directory name", () => {
    assert.strictEqual(isParameterizedPath("/[dir]/file.md"), true);
    assert.strictEqual(isParameterizedPath("/prefix-[dir]/file.md"), true);
    assert.strictEqual(isParameterizedPath("/[dir]-suffix/file.md"), true);
    assert.strictEqual(isParameterizedPath("/[dir]-[number]/file.md"), true);
    assert.strictEqual(isParameterizedPath("/path/[dir]/file.md"), true);
    assert.strictEqual(isParameterizedPath("/[dir1]/[dir2]/file.md"), true);
  });
  it("doesn’t consider an empty parameter to be valid", () => {
    assert.strictEqual(isParameterizedPath("/[]/file.md"), false);
    assert.strictEqual(isParameterizedPath("/path/to/[].md"), false);
  });
  it("returns false for a non-parameterized path", () => {
    assert.strictEqual(isParameterizedPath("/file.md"), false);
    assert.strictEqual(isParameterizedPath("/path/to/file.md"), false);
  });
});

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
  it("finds a partially-parameterized match", () => {
    assert.deepStrictEqual(route("test/input/params", "prefix-foo", [".js"]), {path: "prefix-[file].js", ext: ".js", params: {file: "foo"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "foo-suffix", [".js"]), {path: "[file]-suffix.js", ext: ".js", params: {file: "foo"}}); // prettier-ignore
  });
  it("finds a multi-parameterized match", () => {
    assert.deepStrictEqual(route("test/input/params", "day-14", [".json.js"]), {path: "[period]-[number].json.js", ext: ".json.js", params: {period: "day", number: "14"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "week-4", [".json.js"]), {path: "[period]-[number].json.js", ext: ".json.js", params: {period: "week", number: "4"}}); // prettier-ignore
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
