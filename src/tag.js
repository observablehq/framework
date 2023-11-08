import {Parser, TokContext, tokTypes as tt} from "acorn";
import {Sourcemap} from "./sourcemap.js";

const CODE_DOLLAR = 36;
const CODE_BACKSLASH = 92;
const CODE_BACKTICK = 96;
const CODE_BRACEL = 123;

export function transpileTag(input, tag = "", raw = false) {
  const options = {ecmaVersion: 13, sourceType: "module"};
  const template = TemplateParser.parse(input, options);
  const source = new Sourcemap(input);
  escapeTemplateElements(source, template, raw);
  source.insertLeft(template.start, tag + "`");
  source.insertRight(template.end, "`");
  return String(source);
}

class TemplateParser extends Parser {
  constructor(...args) {
    super(...args);
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
  (parser) => readTemplateToken.call(parser) // override
);

// This is our custom override for parsing a template that allows backticks.
// Based on acorn's readInvalidTemplateToken.
function readTemplateToken() {
  out: for (; this.pos < this.input.length; this.pos++) {
    switch (this.input.charCodeAt(this.pos)) {
      case CODE_BACKSLASH: {
        if (this.pos < this.input.length - 1) ++this.pos; // not a terminal slash
        break;
      }
      case CODE_DOLLAR: {
        if (this.input.charCodeAt(this.pos + 1) === CODE_BRACEL) {
          if (this.pos === this.start && this.type === tt.invalidTemplate) {
            this.pos += 2;
            return this.finishToken(tt.dollarBraceL);
          }
          break out;
        }
        break;
      }
    }
  }
  return this.finishToken(tt.invalidTemplate, this.input.slice(this.start, this.pos));
}

function escapeTemplateElements(source, {quasis}, raw) {
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

function escapeBacktick(source, {start, end}) {
  const input = source._input;
  for (let i = start; i < end; ++i) {
    if (input.charCodeAt(i) === CODE_BACKTICK) {
      source.insertRight(i, "\\");
    }
  }
}

function interpolateBacktick(source, {start, end}) {
  const input = source._input;
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

function escapeBackslash(source, {start, end}) {
  const input = source._input;
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

function interpolateTerminalBackslash(source) {
  const input = source._input;
  let oddBackslashes = false;
  for (let i = input.length - 1; i >= 0; i--) {
    if (input.charCodeAt(i) === CODE_BACKSLASH) oddBackslashes = !oddBackslashes;
    else break;
  }
  if (oddBackslashes) source.replaceRight(input.length - 1, input.length, "${'\\\\'}");
}
