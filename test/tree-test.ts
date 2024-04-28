import assert from "node:assert";
import {tree} from "../src/tree.js";

function stree(items: string[]): string[] {
  return tree(items.map((item) => [item])).map(([indent, name]) => indent + name);
}

describe("tree(items, options)", () => {
  it("creates implicit internal nodes", () => {
    assert.deepStrictEqual(stree(["/a/b/c/d.md"]), [
      ".                    ",
      "└── a                ",
      "    └── b            ",
      "        └── c        ",
      "            └── d.md "
    ]);
  });
  it("handles multiple leaves", () => {
    assert.deepStrictEqual(stree(["/a/b/c/a.md", "/a/b/c/b.md", "/a/b/c/c.md", "/a/b/c/d.md"]), [
      ".                    ",
      "└── a                ",
      "    └── b            ",
      "        └── c        ",
      "            ├── a.md ",
      "            ├── b.md ",
      "            ├── c.md ",
      "            └── d.md "
    ]);
  });
  it("handles leaves at different levels", () => {
    assert.deepStrictEqual(stree(["/a.md", "/a/b.md", "/a/b/c.md", "/a/b/c/d.md"]), [
      ".                    ",
      "├── a                ",
      "│   ├── b            ",
      "│   │   ├── c        ",
      "│   │   │   └── d.md ",
      "│   │   └── c.md     ",
      "│   └── b.md         ",
      "└── a.md             "
    ]);
  });
  it("sorts nodes", () => {
    assert.deepStrictEqual(stree(["/d.md", "/b.md", "/c.md", "/a.md"]), [
      ".        ",
      "├── a.md ",
      "├── b.md ",
      "├── c.md ",
      "└── d.md "
    ]);
  });
  it("sorts folders before files", () => {
    assert.deepStrictEqual(stree(["/d/a.md", "/b.md", "/c.md", "/a.md"]), [
      ".            ",
      "├── d        ",
      "│   └── a.md ",
      "├── a.md     ",
      "├── b.md     ",
      "└── c.md     "
    ]);
  });
  it("sorts nested folders", () => {
    assert.deepStrictEqual(stree(["/b/b.md", "/a/b.md", "/b/a.md", "/a/a.md"]), [
      ".            ",
      "├── a        ",
      "│   ├── a.md ",
      "│   └── b.md ",
      "└── b        ",
      "    ├── a.md ",
      "    └── b.md "
    ]);
  });
  it("computes string width based on graphemes", () => {
    assert.deepStrictEqual(stree(["ascii.md", "💩.md", "👩🏾‍❤️‍👨🏻.md"]), [
      ".            ",
      "├── ascii.md ",
      "├── 👩🏾‍❤️‍👨🏻.md     ",
      "└── 💩.md     "
    ]);
  });
});
