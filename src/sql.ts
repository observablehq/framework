import {Parser, tokTypes} from "acorn";
import {acornOptions} from "./javascript/parse.js";
import {transpileTag} from "./tag.js";

export function transpileSql(content: string, attributes: Record<string, string> = {}): string {
  const sql = transpileTag(content, "sql", true);
  const {id, display = id === undefined ? "" : "false"} = attributes;
  if (id === undefined) return display.toLowerCase() === "false" ? `${sql};` : sql;
  if (!isValidBinding(id)) throw new SyntaxError(`invalid binding: ${id}`);
  return `const ${id} = ${display.toLowerCase() === "false" ? `await ${sql}` : `display(await ${sql})`};`;
}

function isValidBinding(input: string): boolean {
  try {
    const parser = new (Parser as any)(acornOptions, input, 0); // private constructor
    parser.nextToken();
    const token = parser.parseBindingAtom();
    if (token.start !== 0 || token.end !== input.length) return false; // don’t allow comments
    if (parser.type !== tokTypes.eof) return false; // don’t allow trailing garbage
    return true;
  } catch {
    return false;
  }
}
