import assert from "node:assert";
import {createHmac} from "node:crypto";
import {type ResolvedDatabaseReference, resolveDatabase} from "../../src/javascript/databases.js";
import type {DatabaseReference} from "../../src/javascript.js";

describe("resolveDatabase", () => {
  const exp = Date.UTC(2020, 0, 1);
  const snow2 = {
    name: "snow2",
    type: "snowflake",
    host: "localhost",
    port: "2899",
    ssl: "disabled",
    origin: "http://127.0.0.1:3000",
    secret: "0249f7ba6fff3856cb9868d115dbcd6b2ef51f1e9a55fdc6f7484013b7c191c5"
  };
  const env = {
    OBSERVABLEHQ_DB_SECRET_snow2: Buffer.from(JSON.stringify(snow2), "utf-8").toString("base64")
  };
  it("returns a resolved database reference", async () => {
    const input: DatabaseReference = {name: "snow2"};
    const output = resolveDatabase(input, {env, exp});
    assert.deepStrictEqual<ResolvedDatabaseReference>(output, {
      name: "snow2",
      token: "eyJuYW1lIjoic25vdzIiLCJleHAiOjE1Nzc4MzY4MDAwMDB9.P4Zhh8OSkq7TGARf2Rid6OyL1m0WL3nWe+w01DWtTng=",
      type: "snowflake",
      url: "http://localhost:2899/"
    });
    const [encodedData, hmac] = output.token.split(".");
    const decodedData = Buffer.from(encodedData, "base64").toString("utf-8");
    assert.deepStrictEqual(JSON.parse(decodedData), {name: "snow2", exp});
    const expectedHmac = createHmac("sha256", Buffer.from(snow2.secret, "hex")).update(decodedData).digest("base64");
    assert.strictEqual(hmac, expectedHmac);
  });
  it("does not mutate the passed-in database reference", async () => {
    const input = {name: "snow2"};
    resolveDatabase(input, {env});
    assert.deepStrictEqual(input, {name: "snow2"});
  });
  it("returns an unresolved database reference when it can’t be resolved", async () => {
    const input = {name: "notthere"};
    assert.strictEqual(resolveDatabase(input), input);
    assert.deepStrictEqual(input, {name: "notthere"});
  });
});
