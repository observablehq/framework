import {Parser, tokTypes} from "acorn";
import {acornOptions} from "./javascript/parse.js";
import {transpileTag} from "./tag.js";

export function transpileSql(content: string, {id, display}: Record<string, string> = {}): string {
  if (id !== undefined && !isValidBinding(id)) throw new SyntaxError(`invalid binding: ${id}`);
  const sql = transpileTag(content, "sql", true);
  display = display === undefined ? (id === undefined ? "" : "false") : display.toLowerCase();
  return id === undefined
    ? display === "false"
      ? `${sql};`
      : `display(Inputs.table(await ${sql}, {select: false}));`
    : display === "false"
    ? `const ${id} = await ${sql};`
    : `const ${id} = ((_) => (display(Inputs.table(_, {select: false})), _))(await ${sql});`;
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
