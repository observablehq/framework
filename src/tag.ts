import type {Options, TemplateElement, TemplateLiteral} from "acorn";
// @ts-expect-error TokContext is private
import {Parser, TokContext, tokTypes as tt} from "acorn";
import {Sourcemap} from "./sourcemap.js";

const CODE_DOLLAR = 36;
const CODE_BACKSLASH = 92;
const CODE_BACKTICK = 96;
const CODE_BRACEL = 123;

export function transpileTag(input: string, tag = "", raw = false): string {
  const template = TemplateParser.parse(input, {ecmaVersion: 13, sourceType: "module"}) as unknown as TemplateLiteral;
  const output = new Sourcemap(input);
  output.trim();
  escapeTemplateElements(output, template, raw);
  output.insertLeft(template.start, tag + "`");
  output.insertRight(template.end, "`");
  return String(output);
}

class TemplateParser extends (Parser as any) {
  constructor(options: Options, input: string, startPos?: number) {
    super(options, input, startPos);
    // Initialize the type so that we're inside a backQuote
    this.type = tt.backQuote;
    this.exprAllowed = false;
  }
  initialContext() {
    // Provide our custom TokContext
    return [o_tmpl];
  }
  parseTopLevel(body) {
    // Fix for nextToken calling finishToken(tt.eof)
    if (this.type === tt.eof) this.value = "";
    // Based on acorn.Parser.parseTemplate
    const isTagged = true;
    body.expressions = [];
    let curElt = this.parseTemplateElement({isTagged});
    body.quasis = [curElt];
    while (this.type !== tt.eof) {
      this.expect(tt.dollarBraceL);
      body.expressions.push(this.parseExpression());
      this.expect(tt.braceR);
      body.quasis.push((curElt = this.parseTemplateElement({isTagged})));
    }
    curElt.tail = true;
    this.next();
    this.finishNode(body, "TemplateLiteral");
    this.expect(tt.eof);
    return body;
  }
}

// Based on acorn’s q_tmpl. We will use this to initialize the
// parser context so our `readTemplateToken` override is called.
// `readTemplateToken` is based on acorn's `readTmplToken` which
// is used inside template literals. Our version allows backQuotes.
const o_tmpl = new TokContext(
  "`", // token
  true, // isExpr
  true, // preserveSpace
  readTemplateToken // override
);

// This is our custom override for parsing a template that allows backticks.
// Based on acorn's readInvalidTemplateToken.
function readTemplateToken(parser: any) {
  out: for (; parser.pos < parser.input.length; parser.pos++) {
    switch (parser.input.charCodeAt(parser.pos)) {
      case CODE_BACKSLASH: {
        if (parser.pos < parser.input.length - 1) ++parser.pos; // not a terminal slash
        break;
      }
      case CODE_DOLLAR: {
        if (parser.input.charCodeAt(parser.pos + 1) === CODE_BRACEL) {
          if (parser.pos === parser.start && parser.type === tt.invalidTemplate) {
            parser.pos += 2;
            return parser.finishToken(tt.dollarBraceL);
          }
          break out;
        }
        break;
      }
    }
  }
  return parser.finishToken(tt.invalidTemplate, parser.input.slice(parser.start, parser.pos));
}

function escapeTemplateElements(source: Sourcemap, {quasis}: TemplateLiteral, raw: boolean): void {
  for (const quasi of quasis) {
    if (raw) {
      interpolateBacktick(source, quasi);
    } else {
      escapeBacktick(source, quasi);
      escapeBackslash(source, quasi);
    }
  }
  if (raw) interpolateTerminalBackslash(source);
}

function escapeBacktick(source: Sourcemap, {start, end}: TemplateElement): void {
  const input = source.input;
  for (let i = start; i < end; ++i) {
    if (input.charCodeAt(i) === CODE_BACKTICK) {
      source.insertRight(i, "\\");
    }
  }
}

function interpolateBacktick(source: Sourcemap, {start, end}: TemplateElement): void {
  const input = source.input;
  let oddBackslashes = false;
  for (let i = start; i < end; ++i) {
    switch (input.charCodeAt(i)) {
      case CODE_BACKSLASH: {
        oddBackslashes = !oddBackslashes;
        break;
      }
      case CODE_BACKTICK: {
        if (!oddBackslashes) {
          let j = i + 1;
          while (j < end && input.charCodeAt(j) === CODE_BACKTICK) ++j;
          source.replaceRight(i, j, `\${'${"`".repeat(j - i)}'}`);
          i = j - 1;
        }
        // fall through
      }
      default: {
        oddBackslashes = false;
        break;
      }
    }
  }
}

function escapeBackslash(source: Sourcemap, {start, end}: TemplateElement): void {
  const input = source.input;
  let afterDollar = false;
  let oddBackslashes = false;
  for (let i = start; i < end; ++i) {
    switch (input.charCodeAt(i)) {
      case CODE_DOLLAR: {
        afterDollar = true;
        oddBackslashes = false;
        break;
      }
      case CODE_BACKSLASH: {
        oddBackslashes = !oddBackslashes;
        if (afterDollar && input.charCodeAt(i + 1) === CODE_BRACEL) continue;
        if (oddBackslashes && input.charCodeAt(i + 1) === CODE_DOLLAR && input.charCodeAt(i + 2) === CODE_BRACEL)
          continue;
        source.insertRight(i, "\\");
        break;
      }
      default: {
        afterDollar = false;
        oddBackslashes = false;
        break;
      }
    }
  }
}

function interpolateTerminalBackslash(source: Sourcemap): void {
  const input = source.input;
  let oddBackslashes = false;
  for (let i = input.length - 1; i >= 0; i--) {
    if (input.charCodeAt(i) === CODE_BACKSLASH) oddBackslashes = !oddBackslashes;
    else break;
  }
  if (oddBackslashes) source.replaceRight(input.length - 1, input.length, "${'\\\\'}");
}
