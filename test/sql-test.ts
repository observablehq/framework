import assert from "node:assert";
import {transpileSql} from "../src/sql.js";

describe("transpileSql(content, attributes)", () => {
  it("compiles a sql expression", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2"), "display(Inputs.table(await sql`SELECT 1 + 2`, {select: false}));"); // prettier-ignore
  });
  it("compiles a sql expression with id", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2", {id: "foo"}), "const foo = await sql`SELECT 1 + 2`;");
  });
  it("throws a syntax error with invalid identifier", () => {
    assert.throws(() => transpileSql("SELECT 1 + 2", {id: "1"}), /invalid binding/);
  });
  it("compiles a sql expression with complex id binding", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2", {id: "[foo]"}), "const [foo] = await sql`SELECT 1 + 2`;");
    assert.strictEqual(transpileSql("SELECT 1 + 2 AS 'f'", {id: "[{f}]"}), "const [{f}] = await sql`SELECT 1 + 2 AS 'f'`;"); // prettier-ignore
    assert.strictEqual(transpileSql("SELECT 1 + 2 AS 'f'", {id: "[{f: foo}]"}), "const [{f: foo}] = await sql`SELECT 1 + 2 AS 'f'`;"); // prettier-ignore
  });
  it("throws a syntax error with invalid binding", () => {
    assert.throws(() => transpileSql("SELECT 1 + 2", {id: "[foo"}), /invalid binding/);
    assert.throws(() => transpileSql("SELECT 1 + 2", {id: "[foo]//test"}), /invalid binding/);
    assert.throws(() => transpileSql("SELECT 1 + 2", {id: "([foo])"}), /invalid binding/);
  });
  it("compiles a sql expression with id and display", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2", {id: "foo", display: ""}), "const foo = ((_) => (display(Inputs.table(_, {select: false})), _))(await sql`SELECT 1 + 2`);"); // prettier-ignore
  });
  it("ignores display if display is implicit", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2", {display: ""}), "display(Inputs.table(await sql`SELECT 1 + 2`, {select: false}));"); // prettier-ignore
    assert.strictEqual(transpileSql("SELECT 1 + 2", {display: "t"}), "display(Inputs.table(await sql`SELECT 1 + 2`, {select: false}));"); // prettier-ignore
    assert.strictEqual(transpileSql("SELECT 1 + 2", {display: "f"}), "display(Inputs.table(await sql`SELECT 1 + 2`, {select: false}));"); // prettier-ignore
    assert.strictEqual(transpileSql("SELECT 1 + 2", {display: "true"}), "display(Inputs.table(await sql`SELECT 1 + 2`, {select: false}));"); // prettier-ignore
  });
  it("compiles a sql expression with display=false", () => {
    assert.strictEqual(transpileSql("SELECT 1 + 2", {display: "false"}), "sql`SELECT 1 + 2`;");
  });
});
