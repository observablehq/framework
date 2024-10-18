import assert from "node:assert";
import {isParameterized, route} from "../src/route.js";

describe("isParameterizedName(path)", () => {
  it("returns true for a parameterized file name", () => {
    assert.strictEqual(isParameterized("[file].md"), true);
    assert.strictEqual(isParameterized("prefix-[file].md"), true);
    assert.strictEqual(isParameterized("[file]-suffix.md"), true);
    assert.strictEqual(isParameterized("[file]-[number].md"), true);
  });
  it("returns true for a parameterized directory name", () => {
    assert.strictEqual(isParameterized("[dir]"), true);
    assert.strictEqual(isParameterized("prefix-[dir]"), true);
    assert.strictEqual(isParameterized("[dir]-suffix"), true);
    assert.strictEqual(isParameterized("[dir]-[number]"), true);
  });
  it("doesn’t consider an empty parameter to be valid", () => {
    assert.strictEqual(isParameterized("[]"), false);
    assert.strictEqual(isParameterized("[].md"), false);
  });
  it("returns false for a non-parameterized path", () => {
    assert.strictEqual(isParameterized("file.md"), false);
    assert.strictEqual(isParameterized("dir"), false);
  });
});

describe("route(root, path, exts)", () => {
  it("finds an exact file", () => {
    assert.deepStrictEqual(route("test/input/build/simple", "simple", [".md"]), {path: "simple.md", ext: ".md"}); // prettier-ignore
  });
  it("finds an exact file with multiple extensions", () => {
    assert.deepStrictEqual(route("test/input/build/simple", "data", [".txt", ".txt.js", ".txt.py"]), {path: "data.txt.js", ext: ".txt.js"}); // prettier-ignore
  });
  it("finds an exact file with the empty extension", () => {
    assert.deepStrictEqual(route("test/input/params", "README", [""]), {path: "README", ext: ""}); // prettier-ignore
  });
  it("finds a parameterized file", () => {
    assert.deepStrictEqual(route("test/input/params", "bar", [".md"]), {path: "[file].md", ext: ".md", params: {file: "bar"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "baz", [".md"]), {path: "[file].md", ext: ".md", params: {file: "baz"}}); // prettier-ignore
  });
  it("finds a parameterized file with multiple extensions", () => {
    assert.deepStrictEqual(route("test/input/params", "data", [".csv", ".csv.js", ".csv.py"]), {path: "[file].csv.js", ext: ".csv.js", params: {file: "data"}}); // prettier-ignore
  });
  it("finds a parameterized file with the empty extension", () => {
    assert.deepStrictEqual(route("test/input/params/bar", "README", [""]), {path: "[file]", ext: "", params: {file: "README"}}); // prettier-ignore
  });
  it("finds a non-parameterized file ahead of a parameterized file", () => {
    assert.deepStrictEqual(route("test/input/params", "foo", [".md"]), {path: "foo.md", ext: ".md"}); // prettier-ignore
  });
  it("maps a bracketed parameter onto itself", () => {
    assert.deepStrictEqual(route("test/input/params", "[dir]/[file]", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "[dir]", file: "[file]"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "[dir]/foo", [".md"]), {path: "[dir]/foo.md", ext: ".md", params: {dir: "[dir]"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "[dir]/[baz]", [".md"]), {path: "[dir]/[file].md", ext: ".md", params: {dir: "[dir]", file: "[baz]"}}); // prettier-ignore
    assert.deepStrictEqual(route("test/input/params", "foo/[file]", [".md"]), {path: "foo/[file].md", ext: ".md", params: {file: "[file]"}}); // prettier-ignore
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
});
