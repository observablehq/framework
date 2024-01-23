import assert from "node:assert";
import {parseInterpolate} from "../src/interpolate.js";

describe.only("parseInterpolate", () => {
  it("finds interpolations within data", () => {
    assert.deepStrictEqual(parseInterpolate("Hello, ${'world'}!"), {
      source: "Hello, <!-- o:1 -->!",
      expressions: [{id: 1, source: "'world'", state: 1}]
    });
  });
  it("finds interpolations within unquoted attributes", () => {
    assert.deepStrictEqual(parseInterpolate("<div class=${'red'}>color</div>"), {
      source: '<div o:class="1">color</div>',
      expressions: [{id: 1, source: "'red'", state: 12}]
    });
  });
  it("ignores interpolations within quoted attributes", () => {
    assert.deepStrictEqual(parseInterpolate("<div class=\"${'red'}\">color</div>"), {
      source: "<div class=\"${'red'}\">color</div>",
      expressions: []
    });
    assert.deepStrictEqual(parseInterpolate("<div class=\"${'red'}dish\">color</div>"), {
      source: "<div class=\"${'red'}dish\">color</div>",
      expressions: []
    });
  });
  it("finds interpolations within tags", () => {
    assert.deepStrictEqual(parseInterpolate("<div ${{class: 'red'}}>color</div>"), {
      source: '<div o:="1">color</div>',
      expressions: [{id: 1, source: "{class: 'red'}", state: 6}]
    });
  });
  it("finds multiple interpolations", () => {
    assert.deepStrictEqual(parseInterpolate("Hello, ${'world'}! This is <span class=${'red'}>color</span>."), {
      source: 'Hello, <!-- o:1 -->! This is <span o:class="2">color</span>.',
      expressions: [
        {id: 1, source: "'world'", state: 1},
        {id: 2, source: "'red'", state: 12}
      ]
    });
  });
});
