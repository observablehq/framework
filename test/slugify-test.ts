import assert from "node:assert";
import {slugify} from "../src/slugify.js";

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
  it("handles apostrophes", async () => {
    assert.equal(slugify("hello'world"), "helloworld");
  });
  it("handles empty strings", async () => {
    assert.equal(slugify(""), "");
  });
});
