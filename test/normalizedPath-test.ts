import assert from "node:assert";
import {pathToFileURL, toOsSlashes, toUrlSlashes} from "../src/normalizedPath.js";

describe("toOsSlashes", () => {
  describe("on a posix platform", () => {
    const opts = {sep: "/"} as const;

    it("handles absolute paths", () => {
      assert.equal(toOsSlashes("/", opts), "/");
      assert.equal(toOsSlashes("/a", opts), "/a");
      assert.equal(toOsSlashes("/a/b", opts), "/a/b");
      assert.equal(toOsSlashes("/a/b/c", opts), "/a/b/c");
    });

    it("handles relative paths", () => {
      assert.equal(toOsSlashes("a", opts), "a");
      assert.equal(toOsSlashes("a/b", opts), "a/b");
      assert.equal(toOsSlashes("a/b/c", opts), "a/b/c");
    });
  });

  describe("on Windows", () => {
    const opts = {sep: "\\"} as const;

    it("throws an error on absolute paths without drive letters", () => {
      for (const path of ["/", "/a", "/a/b", "/a/b/c"]) {
        assert.throws(() => toOsSlashes(path, opts), /expected a drive letter/);
      }
    });

    it("handles absolute paths with drive letters", () => {
      assert.equal(toOsSlashes("/c:", opts), "c:\\");
      assert.equal(toOsSlashes("/c:/a", opts), "c:\\a");
      assert.equal(toOsSlashes("/C:/a/b", opts), "C:\\a\\b");
      assert.equal(toOsSlashes("/C:/a/b/c", opts), "C:\\a\\b\\c");
    });

    it("handles relative paths", () => {
      assert.equal(toOsSlashes("a", opts), "a");
      assert.equal(toOsSlashes("a/b", opts), "a\\b");
      assert.equal(toOsSlashes("a/b/c", opts), "a\\b\\c");
    });

    it("throws an error on relative paths with drive letters", () => {
      for (const path of ["c:", "c:/a", "c:/a/b", "c:/a/b/c"]) {
        assert.throws(() => toOsSlashes(path, opts), /unexpected drive letter/);
      }
    });
  });
});

describe("toUrlSlashes", () => {
  describe("on a posix platform", () => {
    const opts = {sep: "/"} as const;

    it("handles absolute paths", () => {
      assert.equal(toUrlSlashes("/", opts), "/");
      assert.equal(toUrlSlashes("/a", opts), "/a");
      assert.equal(toUrlSlashes("/a/b", opts), "/a/b");
      assert.equal(toUrlSlashes("/a/b/c", opts), "/a/b/c");
    });

    it("handles relative paths", () => {
      assert.equal(toUrlSlashes("a", opts), "a");
      assert.equal(toUrlSlashes("a/b", opts), "a/b");
      assert.equal(toUrlSlashes("a/b/c", opts), "a/b/c");
    });
  });

  describe("on Windows", () => {
    const opts = {sep: "\\"} as const;

    it("throws an error on absolute paths without drive letters", () => {
      for (const path of ["\\", "\\a", "\\a\\b", "\\a\\b\\c"]) {
        assert.throws(() => toUrlSlashes(path, opts), /expected a drive letter/);
      }
    });

    it("handles absolute paths with drive letters", () => {
      assert.equal(toUrlSlashes("C:\\", opts), "/C:/");
      assert.equal(toUrlSlashes("D:\\a", opts), "/D:/a");
      assert.equal(toUrlSlashes("E:\\a\\b", opts), "/E:/a/b");
      assert.equal(toUrlSlashes("F:\\a\\b\\c", opts), "/F:/a/b/c");
    });

    it("handles relative paths", () => {
      assert.equal(toUrlSlashes("a", opts), "a");
      assert.equal(toUrlSlashes("a\\b", opts), "a/b");
      assert.equal(toUrlSlashes("a\\b\\c", opts), "a/b/c");
    });
  });
});

describe("pathToFileURL", () => {
  it("works with absolute Windows paths", () => {
    assert.equal(pathToFileURL("/C:/Users/Amaya/Projects/acme-bi").href, "file:///C:/Users/Amaya/Projects/acme-bi");
  });
});
