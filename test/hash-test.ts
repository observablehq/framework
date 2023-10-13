import {computeHash} from "../src/hash.js";
import assert from "node:assert";

describe("computeHash(content)", () => {
  it("returns the expected result", () => {
    assert.deepStrictEqual(computeHash(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert.deepStrictEqual(computeHash("hello"), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });
});
