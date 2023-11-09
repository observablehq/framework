import assert from "node:assert";
import {makeCLIResolver} from "../src/resolver.js";

describe("resolver", () => {
  it("resolves a database client", async () => {
    const resolver = await makeCLIResolver({
      env: {
        OBSERVABLEHQ_DB_SECRET_snow2:
          "eyJuYW1lIjoic25vdzIiLCJ0eXBlIjoic25vd2ZsYWtlIiwiaG9zdCI6ImxvY2FsaG9zdCIsInBvcnQiOiIyODk5Iiwic3NsIjoiZGlzYWJsZWQiLCJvcmlnaW4iOiJodHRwOi8vMTI3LjAuMC4xOjMwMDAiLCJzZWNyZXQiOiJhNzQyOGJjMWY1ZjhhYzlkYTgzZDQ1ZGFlNTMwMDA5NjczY2U5MTRkY2ZmZDM0ZDA5ZTM2ZmUwY2I2M2Y4ZTMxIn0="
      }
    });
    const cell = resolver({
      type: "cell",
      id: "",
      body: "",
      databases: [{name: "snow2"}]
    });
    assert.equal(cell.databases?.length, 1);
    const database = cell.databases![0];
    const token = (database as any).token;
    const tokenDecoded = JSON.parse(Buffer.from(token.split(".")[0], "base64").toString("utf8"));
    assert.equal(tokenDecoded.name, "snow2");
    assert.deepStrictEqual(database, {name: "snow2", type: "snowflake", url: "http://localhost:2899/", token});
  });

  it("throws an error when it can't resolve", async () => {
    const resolver = await makeCLIResolver({
      env: {
        OBSERVABLEHQ_DB_SECRET_snow2:
          "eyJuYW1lIjoic25vdzIiLCJ0eXBlIjoic25vd2ZsYWtlIiwiaG9zdCI6ImxvY2FsaG9zdCIsInBvcnQiOiIyODk5Iiwic3NsIjoiZGlzYWJsZWQiLCJvcmlnaW4iOiJodHRwOi8vMTI3LjAuMC4xOjMwMDAiLCJzZWNyZXQiOiJhNzQyOGJjMWY1ZjhhYzlkYTgzZDQ1ZGFlNTMwMDA5NjczY2U5MTRkY2ZmZDM0ZDA5ZTM2ZmUwY2I2M2Y4ZTMxIn0="
      }
    });
    try {
      resolver({
        type: "cell",
        id: "",
        body: "",
        databases: [{name: "notthere"}]
      });
      assert.fail("should have thrown");
    } catch (error: any) {
      assert.equal(error.message, 'Unable to resolve database "notthere"');
    }
  });
});
