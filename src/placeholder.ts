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
  CODE_BACKSLASH = 92,
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
  type: "html_block" | "placeholder";
  content: string;
  pos: number;
}

export function* parsePlaceholder(input: string, start = 0, end = input.length): Generator<PlaceholderToken> {
  let state: number | undefined = STATE_DATA;
  let tagNameStart: number | undefined; // either an open tag or an end tag
  let tagName: string | undefined; // only open; beware nesting! used only for rawtext
  let afterDollar = false; // immediately following $?
  let afterBackslash = false; // immediately following \?
  let content = ""; // accumulated content
  let index = start;

  for (let i = start; i < end; ++i) {
    const code = input.charCodeAt(i);

    // Detect inline expressions.
    if (state === STATE_DATA) {
      if (code === CODE_BACKSLASH) {
        afterBackslash = true;
      } else if (code === CODE_DOLLAR) {
        if (afterBackslash) {
          content += input.slice(index, (index = i) - 1);
          afterBackslash = false;
        } else {
          afterDollar = true;
        }
      } else if (afterBackslash) {
        afterBackslash = false;
        if (afterDollar && code === CODE_LBRACE) {
          content += input.slice(index, (index = i) - 1);
        }
      } else if (afterDollar) {
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
                if ((content += input.slice(index, i - 1))) {
                  yield {type: "html_block", content, pos: i - 1};
                  content = "";
                }
                yield {type: "placeholder", content: input.slice(i + 1, (i = parser.pos - 1)), pos: parser.pos};
                index = parser.pos;
                break;
              }
            } while (parser.type !== tokTypes.eof);
          } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
            // ignore invalid token (e.g., unterminated template, bad unicode escape)
          }
        }
      } else {
        afterBackslash = false;
        afterDollar = false;
      }
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

  if ((content += input.slice(index, end))) yield {type: "html_block", content, pos: end};
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
