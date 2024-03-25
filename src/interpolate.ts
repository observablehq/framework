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
  // CODE_QUOTE = 34,
  // CODE_SINGLE_QUOTE = 39,
  CODE_BACKTICK = 96,
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
// SHOW_COMMENT = 128,
// SHOW_ELEMENT = 1,
// TYPE_COMMENT = 8,
// TYPE_ELEMENT = 1,
// NS_SVG = "http://www.w3.org/2000/svg",
// NS_XLINK = "http://www.w3.org/1999/xlink",
// NS_XML = "http://www.w3.org/XML/1998/namespace",
// NS_XMLNS = "http://www.w3.org/2000/xmlns/";

// const svgAdjustAttributes = new Map(
//   [
//     "attributeName",
//     "attributeType",
//     "baseFrequency",
//     "baseProfile",
//     "calcMode",
//     "clipPathUnits",
//     "diffuseConstant",
//     "edgeMode",
//     "filterUnits",
//     "glyphRef",
//     "gradientTransform",
//     "gradientUnits",
//     "kernelMatrix",
//     "kernelUnitLength",
//     "keyPoints",
//     "keySplines",
//     "keyTimes",
//     "lengthAdjust",
//     "limitingConeAngle",
//     "markerHeight",
//     "markerUnits",
//     "markerWidth",
//     "maskContentUnits",
//     "maskUnits",
//     "numOctaves",
//     "pathLength",
//     "patternContentUnits",
//     "patternTransform",
//     "patternUnits",
//     "pointsAtX",
//     "pointsAtY",
//     "pointsAtZ",
//     "preserveAlpha",
//     "preserveAspectRatio",
//     "primitiveUnits",
//     "refX",
//     "refY",
//     "repeatCount",
//     "repeatDur",
//     "requiredExtensions",
//     "requiredFeatures",
//     "specularConstant",
//     "specularExponent",
//     "spreadMethod",
//     "startOffset",
//     "stdDeviation",
//     "stitchTiles",
//     "surfaceScale",
//     "systemLanguage",
//     "tableValues",
//     "targetX",
//     "targetY",
//     "textLength",
//     "viewBox",
//     "viewTarget",
//     "xChannelSelector",
//     "yChannelSelector",
//     "zoomAndPan"
//   ].map((name) => [name.toLowerCase(), name])
// );

// const svgForeignAttributes = new Map([
//   ["xlink:actuate", NS_XLINK],
//   ["xlink:arcrole", NS_XLINK],
//   ["xlink:href", NS_XLINK],
//   ["xlink:role", NS_XLINK],
//   ["xlink:show", NS_XLINK],
//   ["xlink:title", NS_XLINK],
//   ["xlink:type", NS_XLINK],
//   ["xml:lang", NS_XML],
//   ["xml:space", NS_XML],
//   ["xmlns", NS_XMLNS],
//   ["xmlns:xlink", NS_XMLNS]
// ]);

export function parseInterpolate(input: string) {
  const expressions: any[] = [];
  let state: number | undefined = STATE_DATA;
  let string = "";
  let tagNameStart; // either an open tag or an end tag
  let tagName; // only open; beware nesting! used only for rawtext
  let attributeNameStart;
  let attributeNameEnd;
  let afterDollar = false;
  let afterBackslash = false;
  let nextId = 1;
  let lastIndex = 0;

  for (let i = 0, n = input.length; i < n; ++i) {
    const code = input.charCodeAt(i);

    if (afterBackslash) {
      afterBackslash = false;
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
          // TODO parse JavaScript tokens instead
          let quote = 0;
          let braces = 0;
          let j = i + 1;
          inner: for (; j < n; ++j) {
            const nextCode = input.charCodeAt(j);
            if (nextCode === CODE_BACKSLASH) {
              ++j;
              continue;
            }
            if (quote) {
              if (nextCode === quote) quote = 0;
              continue;
            }
            switch (nextCode) {
              case CODE_DQUOTE:
              case CODE_SQUOTE:
              case CODE_BACKTICK:
                quote = nextCode;
                break;
              case CODE_LBRACE:
                ++braces;
                break;
              case CODE_RBRACE:
                if (--braces < 0) {
                  switch (state) {
                    case STATE_DATA:
                      string += `${input.slice(lastIndex, i - 1)}<!-- o:${nextId} -->`;
                      break;
                    case STATE_BEFORE_ATTRIBUTE_VALUE:
                      state = STATE_ATTRIBUTE_VALUE_UNQUOTED; // TODO handle trailing garbage?
                      string += `${input.slice(lastIndex, attributeNameStart)}o:${input.slice(
                        attributeNameStart,
                        attributeNameEnd
                      )}="${nextId}"`;
                      break;
                    case STATE_BEFORE_ATTRIBUTE_NAME:
                      string += `${input.slice(lastIndex, i - 1)}o:="${nextId}"`;
                      break;
                    default:
                      break inner;
                  }
                  expressions.push({id: nextId++, source: input.slice(i + 1, j), state});
                  lastIndex = j + 1;
                  break inner;
                }
                break;
            }
          }
          i = j;
          continue;
        }
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
          (attributeNameStart = i + 1), (attributeNameEnd = undefined);
        } else {
          (state = STATE_ATTRIBUTE_NAME), --i;
          (attributeNameStart = i + 1), (attributeNameEnd = undefined);
        }
        break;
      }
      case STATE_ATTRIBUTE_NAME: {
        if (isSpaceCode(code) || code === CODE_SLASH || code === CODE_GT) {
          (state = STATE_AFTER_ATTRIBUTE_NAME), --i;
          attributeNameEnd = i;
        } else if (code === CODE_EQ) {
          state = STATE_BEFORE_ATTRIBUTE_VALUE;
          attributeNameEnd = i;
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
          state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
        } else {
          (state = STATE_ATTRIBUTE_NAME), --i;
          (attributeNameStart = i + 1), (attributeNameEnd = undefined);
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
          state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
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
          state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
        }
        break;
      }
      case STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: {
        if (isSpaceCode(code)) {
          state = STATE_BEFORE_ATTRIBUTE_NAME;
        } else if (code === CODE_SLASH) {
          state = STATE_SELF_CLOSING_START_TAG;
        } else if (code === CODE_GT) {
          state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
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

  string += input.slice(lastIndex);

  return {
    source: string,
    expressions
  };
}

// function entity(character) {
//   return `&#${character.charCodeAt(0).toString()};`;
// }

function isAsciiAlphaCode(code) {
  return (CODE_UPPER_A <= code && code <= CODE_UPPER_Z) || (CODE_LOWER_A <= code && code <= CODE_LOWER_Z);
}

function isSpaceCode(code) {
  return code === CODE_TAB || code === CODE_LF || code === CODE_FF || code === CODE_SPACE || code === CODE_CR; // normalize newlines
}

// function isObjectLiteral(value) {
//   return value && value.toString === Object.prototype.toString;
// }

function isRawText(tagName) {
  return tagName === "script" || tagName === "style" || isEscapableRawText(tagName);
}

function isEscapableRawText(tagName) {
  return tagName === "textarea" || tagName === "title";
}

function lower(input, start, end) {
  return input.slice(start, end).toLowerCase();
}

// function setAttribute(node, name, value) {
//   if (node.namespaceURI === NS_SVG) {
//     name = name.toLowerCase();
//     name = svgAdjustAttributes.get(name) || name;
//     if (svgForeignAttributes.has(name)) {
//       node.setAttributeNS(svgForeignAttributes.get(name), name, value);
//       return;
//     }
//   }
//   node.setAttribute(name, value);
// }

// function removeAttribute(node, name) {
//   if (node.namespaceURI === NS_SVG) {
//     name = name.toLowerCase();
//     name = svgAdjustAttributes.get(name) || name;
//     if (svgForeignAttributes.has(name)) {
//       node.removeAttributeNS(svgForeignAttributes.get(name), name);
//       return;
//     }
//   }
//   node.removeAttribute(name);
// }

// // We can’t use Object.assign because custom properties…
// function setStyles(style, values) {
//   for (const name in values) {
//     const value = values[name];
//     if (name.startsWith("--")) style.setProperty(name, value);
//     else style[name] = value;
//   }
// }
