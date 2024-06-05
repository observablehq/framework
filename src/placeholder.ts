import {Parser, tokTypes} from "acorn";
import {acornOptions} from "./javascript/parse.js";

const CODE_TAB = 9,
  CODE_LF = 10,
  CODE_FF = 12,
  CODE_CR = 13,
  CODE_SPACE = 32,
  CODE_UPPER_A = 65,
  CODE_UPPER_Z = 90,
  CODE_LOWER_A = 97,
  CODE_LOWER_Z = 122,
  CODE_LT = 60,
  CODE_GT = 62,
  CODE_SLASH = 47,
  CODE_DASH = 45,
  CODE_BANG = 33,
  CODE_EQ = 61,
  CODE_DQUOTE = 34,
  CODE_SQUOTE = 39,
  CODE_QUESTION = 63,
  CODE_DOLLAR = 36,
  CODE_LBRACE = 123,
  CODE_RBRACE = 125,
  CODE_BACKSLASH = 92,
  CODE_BACKTICK = 96,
  CODE_TILDE = 126,
  STATE_DATA = 1,
  STATE_TAG_OPEN = 2,
  STATE_END_TAG_OPEN = 3,
  STATE_TAG_NAME = 4,
  STATE_BOGUS_COMMENT = 5,
  STATE_BEFORE_ATTRIBUTE_NAME = 6,
  STATE_AFTER_ATTRIBUTE_NAME = 7,
  STATE_ATTRIBUTE_NAME = 8,
  STATE_BEFORE_ATTRIBUTE_VALUE = 9,
  STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 10,
  STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 11,
  STATE_ATTRIBUTE_VALUE_UNQUOTED = 12,
  STATE_AFTER_ATTRIBUTE_VALUE_QUOTED = 13,
  STATE_SELF_CLOSING_START_TAG = 14,
  STATE_COMMENT_START = 15,
  STATE_COMMENT_START_DASH = 16,
  STATE_COMMENT = 17,
  STATE_COMMENT_LESS_THAN_SIGN = 18,
  STATE_COMMENT_LESS_THAN_SIGN_BANG = 19,
  STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH = 20,
  STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 21,
  STATE_COMMENT_END_DASH = 22,
  STATE_COMMENT_END = 23,
  STATE_COMMENT_END_BANG = 24,
  STATE_MARKUP_DECLARATION_OPEN = 25,
  STATE_RAWTEXT = 26,
  STATE_RAWTEXT_LESS_THAN_SIGN = 27,
  STATE_RAWTEXT_END_TAG_OPEN = 28,
  STATE_RAWTEXT_END_TAG_NAME = 29;

export interface PlaceholderToken {
  type: "content" | "code";
  value: string;
}

export function* parsePlaceholder(input: string, start = 0): Generator<PlaceholderToken> {
  let state: number | undefined = STATE_DATA;
  let tagNameStart: number | undefined; // either an open tag or an end tag
  let tagName: string | undefined; // only open; beware nesting! used only for rawtext
  let lineStart = true; // at the start of a line, possibly indented
  let lineIndent = 0; // number of leading spaces for the current line
  let fenceMarkerCode = 0; // within a fenced code block, either CODE_BACKTICK or CODE_TILDE
  let fenceMarkerLength = 0; // within a fenced code block, the number of backticks or tildes
  let afterDollar = false; // immediately following $?
  let afterBackslash = false; // immediate following \?
  let index = start;

  out: for (let i = start, n = input.length; i < n; ++i) {
    const code = input.charCodeAt(i);

    // Detect indentation and fenced code blocks.
    if (code === CODE_LF) {
      lineStart = true;
      lineIndent = 0;
    } else if (lineStart) {
      if (code === CODE_TAB) {
        lineIndent += 4 - (lineIndent % 4);
      } else if (code === CODE_SPACE) {
        ++lineIndent;
      } else {
        lineStart = false;
        if (lineIndent < 4 && (code === CODE_BACKTICK || code === CODE_TILDE)) {
          const j = skipCode(input, code, i + 1);
          if (fenceMarkerCode) {
            // Terminate the fenced code block when a matching marker or at
            // least the same length is found; ignore the matching marker if
            // it’s followed by anything other than spaces or a newline.
            if (fenceMarkerCode === code && fenceMarkerLength >= j - i) {
              const k = skipToEnd(input, j);
              if (k === skipSpace(input, j)) {
                fenceMarkerCode = 0;
                fenceMarkerLength = 0;
                i = k - 1;
                continue;
              }
            }
          } else if (j >= i + 3) {
            // Three or more backticks (```) or tildes (~~~) at the start of a
            // line initiates a new fenced code block, but don’t interpret
            // ```code``` as a fenced code block: if the fenced code block was
            // declared with backticks, the info string (if any) isn’t allowed
            // to contain any backticks.
            const k = skipToEnd(input, j);
            if (!(code === CODE_BACKTICK && containsCode(input, code, j, k))) {
              fenceMarkerCode = code;
              fenceMarkerLength = j - i;
              i = k - 1;
              continue;
            }
          }
        }
      }
    }

    // Skip fenced code blocks (``` or ~~~) and indented code blocks (4 or more
    // leading spaces; tab size of 4).
    if (fenceMarkerCode !== 0 || lineIndent >= 4) continue;

    // Skip code spans. Code spans are terminated either by the same number of
    // backticks (``foo``) or by a blank line (only spaces).
    if (code === CODE_BACKTICK) {
      const j = skipCode(input, code, i + 1);
      for (let k = j; k < n; ++k) {
        switch (input.charCodeAt(k)) {
          case code: {
            const l = skipCode(input, code, k);
            if (l - k === j - i) {
              // paired terminator
              i = l - 1;
              continue out;
            } else {
              // skip unpaired terminator
              k = l - 1;
            }
            break;
          }
          case CODE_LF: {
            const l = skipSpace(input, k + 1);
            if (input.charCodeAt(l) === CODE_LF) {
              // blank line
              i = l - 1;
              continue out;
            }
            break;
          }
        }
      }
    }

    if (state === STATE_DATA) {
      if (afterBackslash) {
        afterBackslash = false;
        if (code === CODE_DOLLAR || (afterDollar && code === CODE_LBRACE)) {
          yield {type: "content", value: input.slice(index, (index = i) - 1)};
          continue;
        }
      } else {
        if (code === CODE_BACKSLASH) {
          afterBackslash = true;
          continue;
        }
        if (code === CODE_DOLLAR) {
          afterDollar = true;
          continue;
        }
        if (afterDollar) {
          afterDollar = false;
          if (code === CODE_LBRACE) {
            const parser = new (Parser as any)(acornOptions, input, i + 1); // private constructor
            let braces = 1;
            try {
              do {
                parser.nextToken();
                if (parser.type === tokTypes.braceL || parser.type === tokTypes.dollarBraceL) {
                  ++braces;
                } else if (parser.type === tokTypes.braceR && !--braces) {
                  if (i > index + 1) yield {type: "content", value: input.slice(index, i - 1)};
                  yield {type: "code", value: input.slice(i + 1, (i = parser.pos - 1))};
                  index = parser.pos;
                  break;
                }
              } while (parser.type !== tokTypes.eof);
            } catch (error) {
              if (!(error instanceof SyntaxError)) throw error;
              // on invalid token (e.g., unterminated template, invalid unicode escape),
              // read until the braces are closed
              let j = parser.pos;
              for (; j < n; ++j) {
                if (input.charCodeAt(j) === CODE_RBRACE && !--braces) {
                  if (i > index + 1) yield {type: "content", value: input.slice(index, i - 1)};
                  yield {type: "code", value: input.slice(i + 1, (i = j))};
                  index = j;
                  break;
                }
              }
            }
            continue;
          }
        }
      }
    } else {
      afterBackslash = false;
      afterDollar = false;
    }

    switch (state) {
      case STATE_DATA: {
        if (code === CODE_LT) {
          state = STATE_TAG_OPEN;
        }
        break;
      }
      case STATE_TAG_OPEN: {
        if (code === CODE_BANG) {
          state = STATE_MARKUP_DECLARATION_OPEN;
        } else if (code === CODE_SLASH) {
          state = STATE_END_TAG_OPEN;
        } else if (isAsciiAlphaCode(code)) {
          (tagNameStart = i), (tagName = undefined);
          (state = STATE_TAG_NAME), --i;
        } else if (code === CODE_QUESTION) {
          (state = STATE_BOGUS_COMMENT), --i;
        } else {
          (state = STATE_DATA), --i;
        }
        break;
      }
      case STATE_END_TAG_OPEN: {
        if (isAsciiAlphaCode(code)) {
          (state = STATE_TAG_NAME), --i;
        } else if (code === CODE_GT) {
          state = STATE_DATA;
        } else {
          (state = STATE_BOGUS_COMMENT), --i;
        }
        break;
      }
      case STATE_TAG_NAME: {
        if (isSpaceCode(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
          tagName = lower(input, tagNameStart, i);
        } else if (code === CODE_SLASH) {
          state = STATE_SELF_CLOSING_START_TAG;
        } else if (code === CODE_GT) {
          tagName = lower(input, tagNameStart, i);
          state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
        }
        break;
      }
      case STATE_BEFORE_ATTRIBUTE_NAME: {
        if (isSpaceCode(code)) {
          // continue
        } else if (code === CODE_SLASH || code === CODE_GT) {
          (state = STATE_AFTER_ATTRIBUTE_NAME), --i;
        } else if (code === CODE_EQ) {
          state = STATE_ATTRIBUTE_NAME;
        } else {
          (state = STATE_ATTRIBUTE_NAME), --i;
        }
        break;
      }
      case STATE_ATTRIBUTE_NAME: {
        if (isSpaceCode(code) || code === CODE_SLASH || code === CODE_GT) {
          (state = STATE_AFTER_ATTRIBUTE_NAME), --i;
        } else if (code === CODE_EQ) {
          state = STATE_BEFORE_ATTRIBUTE_VALUE;
        }
        break;
      }
      case STATE_AFTER_ATTRIBUTE_NAME: {
        if (isSpaceCode(code)) {
          // ignore
        } else if (code === CODE_SLASH) {
          state = STATE_SELF_CLOSING_START_TAG;
        } else if (code === CODE_EQ) {
          state = STATE_BEFORE_ATTRIBUTE_VALUE;
        } else if (code === CODE_GT) {
          state = isRawText(tagName!) ? STATE_RAWTEXT : STATE_DATA;
        } else {
          (state = STATE_ATTRIBUTE_NAME), --i;
        }
        break;
      }
      case STATE_BEFORE_ATTRIBUTE_VALUE: {
        if (isSpaceCode(code)) {
          // continue
        } else if (code === CODE_DQUOTE) {
          state = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        } else if (code === CODE_SQUOTE) {
          state = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
        } else if (code === CODE_GT) {
          state = isRawText(tagName!) ? STATE_RAWTEXT : STATE_DATA;
        } else {
          (state = STATE_ATTRIBUTE_VALUE_UNQUOTED), --i;
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
        if (code === CODE_DQUOTE) {
          state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: {
        if (code === CODE_SQUOTE) {
          state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_UNQUOTED: {
        if (isSpaceCode(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
        } else if (code === CODE_GT) {
          state = isRawText(tagName!) ? STATE_RAWTEXT : STATE_DATA;
        }
        break;
      }
      case STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: {
        if (isSpaceCode(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
        } else if (code === CODE_SLASH) {
          state = STATE_SELF_CLOSING_START_TAG;
        } else if (code === CODE_GT) {
          state = isRawText(tagName!) ? STATE_RAWTEXT : STATE_DATA;
        } else {
          (state = STATE_BEFORE_ATTRIBUTE_NAME), --i;
        }
        break;
      }
      case STATE_SELF_CLOSING_START_TAG: {
        if (code === CODE_GT) {
          state = STATE_DATA;
        } else {
          (state = STATE_BEFORE_ATTRIBUTE_NAME), --i;
        }
        break;
      }
      case STATE_BOGUS_COMMENT: {
        if (code === CODE_GT) {
          state = STATE_DATA;
        }
        break;
      }
      case STATE_COMMENT_START: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_START_DASH;
        } else if (code === CODE_GT) {
          state = STATE_DATA;
        } else {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT_START_DASH: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_END;
        } else if (code === CODE_GT) {
          state = STATE_DATA;
        } else {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT: {
        if (code === CODE_LT) {
          state = STATE_COMMENT_LESS_THAN_SIGN;
        } else if (code === CODE_DASH) {
          state = STATE_COMMENT_END_DASH;
        }
        break;
      }
      case STATE_COMMENT_LESS_THAN_SIGN: {
        if (code === CODE_BANG) {
          state = STATE_COMMENT_LESS_THAN_SIGN_BANG;
        } else if (code !== CODE_LT) {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT_LESS_THAN_SIGN_BANG: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH;
        } else {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
        } else {
          (state = STATE_COMMENT_END), --i;
        }
        break;
      }
      case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
        (state = STATE_COMMENT_END), --i;
        break;
      }
      case STATE_COMMENT_END_DASH: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_END;
        } else {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT_END: {
        if (code === CODE_GT) {
          state = STATE_DATA;
        } else if (code === CODE_BANG) {
          state = STATE_COMMENT_END_BANG;
        } else if (code !== CODE_DASH) {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_COMMENT_END_BANG: {
        if (code === CODE_DASH) {
          state = STATE_COMMENT_END_DASH;
        } else if (code === CODE_GT) {
          state = STATE_DATA;
        } else {
          (state = STATE_COMMENT), --i;
        }
        break;
      }
      case STATE_MARKUP_DECLARATION_OPEN: {
        if (code === CODE_DASH && input.charCodeAt(i + 1) === CODE_DASH) {
          (state = STATE_COMMENT_START), ++i;
        } else {
          // Note: CDATA and DOCTYPE unsupported!
          (state = STATE_BOGUS_COMMENT), --i;
        }
        break;
      }
      case STATE_RAWTEXT: {
        if (code === CODE_LT) {
          state = STATE_RAWTEXT_LESS_THAN_SIGN;
        }
        break;
      }
      case STATE_RAWTEXT_LESS_THAN_SIGN: {
        if (code === CODE_SLASH) {
          state = STATE_RAWTEXT_END_TAG_OPEN;
        } else {
          (state = STATE_RAWTEXT), --i;
        }
        break;
      }
      case STATE_RAWTEXT_END_TAG_OPEN: {
        if (isAsciiAlphaCode(code)) {
          tagNameStart = i;
          (state = STATE_RAWTEXT_END_TAG_NAME), --i;
        } else {
          (state = STATE_RAWTEXT), --i;
        }
        break;
      }
      case STATE_RAWTEXT_END_TAG_NAME: {
        if (isSpaceCode(code) && tagName === lower(input, tagNameStart, i)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
        } else if (code === CODE_SLASH && tagName === lower(input, tagNameStart, i)) {
          state = STATE_SELF_CLOSING_START_TAG;
        } else if (code === CODE_GT && tagName === lower(input, tagNameStart, i)) {
          state = STATE_DATA;
        } else if (!isAsciiAlphaCode(code)) {
          (state = STATE_RAWTEXT), --i;
        }
        break;
      }
      default: {
        state = undefined;
        break;
      }
    }
  }

  if (index < input.length) yield {type: "content", value: input.slice(index)};
}

function isAsciiAlphaCode(code: number): boolean {
  return (CODE_UPPER_A <= code && code <= CODE_UPPER_Z) || (CODE_LOWER_A <= code && code <= CODE_LOWER_Z);
}

function isSpaceCode(code: number): boolean {
  return code === CODE_TAB || code === CODE_LF || code === CODE_FF || code === CODE_SPACE || code === CODE_CR; // normalize newlines
}

function isRawText(tagName: string): boolean {
  return tagName === "script" || tagName === "style" || isEscapableRawText(tagName);
}

function isEscapableRawText(tagName: string): boolean {
  return tagName === "textarea" || tagName === "title";
}

function lower(input: string, start?: number | undefined, end?: number | undefined): string {
  return input.slice(start, end).toLowerCase();
}

function skipCode(input: string, code: number, index: number): number {
  while (input.charCodeAt(index) === code) ++index;
  return index;
}

function skipSpace(input: string, index: number): number {
  let c: number;
  while (((c = input.charCodeAt(index)), c === CODE_SPACE || c === CODE_TAB)) ++index;
  return index;
}

function skipToEnd(input: string, index: number): number {
  const length = input.length;
  while (index < length && input.charCodeAt(index) !== CODE_LF) ++index;
  return index;
}

function containsCode(input: string, code: number, start: number, end: number): boolean {
  for (let index = start; index < end; ++index) {
    if (input.charCodeAt(index) === code) {
      return true;
    }
  }
  return false;
}
