/* eslint-disable import/no-named-as-default-member */
import he from "he";

const //
  CODE_TAB = 9,
  CODE_LF = 10,
  CODE_FF = 12,
  CODE_CR = 13,
  CODE_SPACE = 32,
  CODE_GT = 62,
  CODE_SLASH = 47,
  CODE_EQ = 61,
  CODE_DQUOTE = 34,
  CODE_SQUOTE = 39,
  STATE_TAG_NAME = 4,
  STATE_BEFORE_ATTRIBUTE_NAME = 6,
  STATE_AFTER_ATTRIBUTE_NAME = 7,
  STATE_ATTRIBUTE_NAME = 8,
  STATE_BEFORE_ATTRIBUTE_VALUE = 9,
  STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 10,
  STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 11,
  STATE_ATTRIBUTE_VALUE_UNQUOTED = 12;

export interface Info {
  tag: string;
  attributes: Record<string, string>;
}

// Based on https://github.com/observablehq/htl
export function parseInfo(input: string): Info {
  let state = STATE_TAG_NAME;
  let tag = "";
  let attributeName: string | undefined;
  let attributeNameStart: number | undefined;
  let attributeValueStart: number | undefined;
  const attributes = {};
  for (let i = 0, n = input.length; i <= n; ++i) {
    const code = input.charCodeAt(i); // note: inclusive upper bound; code may be NaN!
    switch (state) {
      case STATE_TAG_NAME: {
        if (isSpaceCode(code) || isNaN(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
          tag = lower(input, 0, i);
        }
        break;
      }
      case STATE_BEFORE_ATTRIBUTE_NAME: {
        if (isSpaceCode(code) || isNaN(code)) {
          // continue
        } else if (code === CODE_SLASH || code === CODE_GT) {
          state = STATE_AFTER_ATTRIBUTE_NAME;
          --i;
        } else if (code === CODE_EQ) {
          attributeNameStart = i + 1;
          state = STATE_ATTRIBUTE_NAME;
        } else {
          attributeNameStart = i;
          state = STATE_ATTRIBUTE_NAME;
          --i;
        }
        break;
      }
      case STATE_ATTRIBUTE_NAME: {
        if (isSpaceCode(code) || isNaN(code) || code === CODE_SLASH || code === CODE_GT) {
          attributeName = lower(input, attributeNameStart!, i);
          attributes[attributeName] = "";
          state = STATE_AFTER_ATTRIBUTE_NAME;
          --i;
        } else if (code === CODE_EQ) {
          state = STATE_BEFORE_ATTRIBUTE_VALUE;
          attributeName = lower(input, attributeNameStart!, i);
          attributes[attributeName] = "";
        }
        break;
      }
      case STATE_AFTER_ATTRIBUTE_NAME: {
        if (isSpaceCode(code) || isNaN(code)) {
          // ignore
        } else if (code === CODE_SLASH) {
          state = STATE_BEFORE_ATTRIBUTE_NAME; // normally STATE_SELF_CLOSING_START_TAG
        } else if (code === CODE_EQ) {
          state = STATE_BEFORE_ATTRIBUTE_VALUE;
        } else if (code === CODE_GT) {
          state = STATE_BEFORE_ATTRIBUTE_NAME; // normally STATE_RAWTEXT or STATE_DATA
        } else {
          attributeNameStart = i;
          state = STATE_ATTRIBUTE_NAME;
          --i;
        }
        break;
      }
      case STATE_BEFORE_ATTRIBUTE_VALUE: {
        if (isSpaceCode(code) || isNaN(code)) {
          // continue
        } else if (code === CODE_DQUOTE) {
          state = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
          attributeValueStart = i + 1;
        } else if (code === CODE_SQUOTE) {
          state = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
          attributeValueStart = i + 1;
        } else if (code === CODE_GT) {
          state = STATE_BEFORE_ATTRIBUTE_NAME; // normally STATE_RAWTEXT or STATE_DATA
        } else {
          attributeValueStart = i;
          state = STATE_ATTRIBUTE_VALUE_UNQUOTED;
          --i;
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
        if (code === CODE_DQUOTE || isNaN(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME; // normally STATE_AFTER_ATTRIBUTE_VALUE_QUOTED
          attributes[attributeName!] = decode(input, attributeValueStart!, i);
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: {
        if (code === CODE_SQUOTE || isNaN(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME; // normally STATE_AFTER_ATTRIBUTE_VALUE_QUOTED
          attributes[attributeName!] = decode(input, attributeValueStart!, i);
        }
        break;
      }
      case STATE_ATTRIBUTE_VALUE_UNQUOTED: {
        if (isSpaceCode(code) || isNaN(code) || code === CODE_GT) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
          attributes[attributeName!] = decode(input, attributeValueStart!, i);
        }
        break;
      }
    }
  }
  return {tag, attributes};
}

function isSpaceCode(code: number): boolean {
  return (
    code === CODE_TAB ||
    code === CODE_LF || // normalize newlines
    code === CODE_FF ||
    code === CODE_SPACE ||
    code === CODE_CR
  );
}

function lower(input: string, start: number, end: number): string {
  return input.slice(start, end).toLowerCase();
}

function decode(input: string, start: number, end: number): string {
  return he.decode(input.slice(start, end), {isAttributeValue: true});
}
