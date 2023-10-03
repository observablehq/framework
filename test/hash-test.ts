import {computeHash} from "../src/hash.js";
import assert from "node:assert";

describe("computeHash(content)", () => {
  it("returns the expected result", () => {
    assert.deepStrictEqual(computeHash(""), "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
    assert.deepStrictEqual(computeHash("hello"), "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
  });
});
