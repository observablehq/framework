import assert from "node:assert";
import slugify from "@sindresorhus/slugify";

describe("slugify", () => {
  it("works", async () => {
    assert.equal(slugify("Hello, World!"), "hello-world");
  });
  it("removes leading and trailing hyphens", async () => {
    assert.equal(slugify("-hello world-"), "hello-world");
  });
  it("removes duplicatehyphens", async () => {
    assert.equal(slugify("hello--world"), "hello-world");
  });
  it("handles punctuation", async () => {
    assert.equal(slugify("u.s. map"), "u-s-map");
    assert.equal(slugify("hello'world"), "hello-world");
    assert.equal(slugify("hello''world"), "hello-world");
    assert.equal(slugify("hello…"), "hello");
    assert.equal(slugify("'"), "");
    assert.equal(slugify("…"), "");
  });
  it("handles empty strings", async () => {
    assert.equal(slugify(""), "");
  });
});
