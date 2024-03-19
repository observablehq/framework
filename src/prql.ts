import {CompileOptions, compile as prql2sql} from "prql-js";
import {transpileSql} from "./sql.js";

const prqlOptions = Object.assign(new CompileOptions(), {
  target: "sql.duckdb",
  format: false,
  signature_comment: false
});

export function transpilePrql(content: string, attributes?: Record<string, string>): string {
  try {
    content = prql2sql(content, prqlOptions) ?? "";
  } catch (error: any) {
    const [message] = JSON.parse(error.message).inner;
    throw new SyntaxError(message.display);
  }
  return transpileSql(content, attributes);
}
