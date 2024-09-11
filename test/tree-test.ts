import assert from "node:assert";
import {tree} from "../src/tree.js";

function stree(items: string[]): string[] {
  return tree(items.map((item) => [item, null])).map(([indent, name, description]) => indent + name + description);
}

describe("tree(items, options)", () => {
  it("collapses single-child nodes", () => {
    assert.deepStrictEqual(stree(["/a/b/c/d"]), [
      "┌ (1 page)  ",
      "└── a/b/c/d "
    ]); // prettier-ignore
  });
  it("collapses single-child nodes", () => {
    assert.deepStrictEqual(stree(["/a/b/c/d", "/a/b/c/e"]), [
      "┌ (2 pages)         ",
      "└── a/b/c (2 pages) ",
      "    ├── d           ",
      "    └── e           "
    ]);
  });
  it("creates implicit internal nodes", () => {
    assert.deepStrictEqual(stree(["/a/b/c/d"]), [
      "┌ (1 page)  ",
      "└── a/b/c/d "
    ]); // prettier-ignore
  });
  it("removes the .md extension, if present", () => {
    assert.deepStrictEqual(stree(["/a/b/c/a.md", "/a/b/c/b.md", "/a/b/c/c.md", "/a/b/c/d.md"]), [
      "┌ (4 pages)         ",
      "└── a/b/c (4 pages) ",
      "    ├── a           ",
      "    ├── b           ",
      "    ├── c           ",
      "    └── d           "
    ]);
  });
  it("handles multiple leaves", () => {
    assert.deepStrictEqual(stree(["/a/b/c/a", "/a/b/c/b", "/a/b/c/c", "/a/b/c/d"]), [
      "┌ (4 pages)         ",
      "└── a/b/c (4 pages) ",
      "    ├── a           ",
      "    ├── b           ",
      "    ├── c           ",
      "    └── d           "
    ]);
  });
  it("handles leaves at different levels", () => {
    assert.deepStrictEqual(stree(["/a", "/a/b", "/a/b/c", "/a/b/c/d"]), [
      "┌ (4 pages)         ",
      "├── a (3 pages)     ",
      "│   ├── b (2 pages) ",
      "│   │   ├── c/d     ",
      "│   │   └── c       ",
      "│   └── b           ",
      "└── a               "
    ]);
  });
  it("sorts nodes", () => {
    assert.deepStrictEqual(stree(["/d", "/b", "/c", "/a"]), [
      "┌ (4 pages) ",
      "├── a       ",
      "├── b       ",
      "├── c       ",
      "└── d       "
    ]);
  });
  it("sorts folders before files", () => {
    assert.deepStrictEqual(stree(["/d/a", "/b", "/c", "/a"]), [
      "┌ (4 pages) ",
      "├── d/a     ",
      "├── a       ",
      "├── b       ",
      "└── c       "
    ]);
  });
  it("sorts nested folders", () => {
    assert.deepStrictEqual(stree(["/b/b", "/a/b", "/b/a", "/a/a"]), [
      "┌ (4 pages)     ",
      "├── a (2 pages) ",
      "│   ├── a       ",
      "│   └── b       ",
      "└── b (2 pages) ",
      "    ├── a       ",
      "    └── b       "
    ]);
  });
  it("computes string width based on graphemes", () => {
    assert.deepStrictEqual(stree(["ascii", "💩", "👩🏾‍❤️‍👨🏻"]), [
      "┌ (3 pages) ",
      "├── ascii   ",
      "├── 👩🏾‍❤️‍👨🏻       ",
      "└── 💩       "
    ]);
  });
});
