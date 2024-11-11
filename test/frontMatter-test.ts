import assert from "node:assert";
import {normalizeFrontMatter} from "../src/frontMatter.js";

describe("normalizeFrontMatter(spec)", () => {
  it("returns the empty object for an undefined, null, empty spec", () => {
    assert.deepStrictEqual(normalizeFrontMatter(), {});
    assert.deepStrictEqual(normalizeFrontMatter(undefined), {});
    assert.deepStrictEqual(normalizeFrontMatter(null), {});
    assert.deepStrictEqual(normalizeFrontMatter(false), {});
    assert.deepStrictEqual(normalizeFrontMatter(true), {});
    assert.deepStrictEqual(normalizeFrontMatter({}), {});
    assert.deepStrictEqual(normalizeFrontMatter(42), {});
  });
  it("coerces the title to a string or null", () => {
    assert.deepStrictEqual(normalizeFrontMatter({title: 42}), {title: "42"});
    assert.deepStrictEqual(normalizeFrontMatter({title: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({title: null}), {title: null});
    assert.deepStrictEqual(normalizeFrontMatter({title: false}), {title: null});
    assert.deepStrictEqual(normalizeFrontMatter({title: ""}), {title: ""});
    assert.deepStrictEqual(normalizeFrontMatter({title: 0}), {title: "0"});
    assert.deepStrictEqual(normalizeFrontMatter({title: "foo"}), {title: "foo"});
    assert.deepStrictEqual(normalizeFrontMatter({title: {toString: () => "foo"}}), {title: "foo"});
  });
  it("coerces the toc to {show?, label?}", () => {
    assert.deepStrictEqual(normalizeFrontMatter({toc: false}), {toc: {show: false}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: true}), {toc: {show: true}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: null}), {toc: {show: false}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: ""}), {toc: {show: false}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: 42}), {toc: {show: true}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {}}), {toc: {}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {show: 1}}), {toc: {show: true}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {show: 0}}), {toc: {show: false}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {show: null}}), {toc: {show: false}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {show: undefined}}), {toc: {}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {label: null}}), {toc: {label: "null"}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {label: false}}), {toc: {label: "false"}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {label: 42}}), {toc: {label: "42"}});
    assert.deepStrictEqual(normalizeFrontMatter({toc: {label: {toString: () => "foo"}}}), {toc: {label: "foo"}});
  });
  it("coerces index to a boolean", () => {
    assert.deepStrictEqual(normalizeFrontMatter({index: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({index: null}), {index: false});
    assert.deepStrictEqual(normalizeFrontMatter({index: 0}), {index: false});
    assert.deepStrictEqual(normalizeFrontMatter({index: 1}), {index: true});
    assert.deepStrictEqual(normalizeFrontMatter({index: true}), {index: true});
    assert.deepStrictEqual(normalizeFrontMatter({index: false}), {index: false});
  });
  it("coerces sidebar to a boolean", () => {
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: null}), {sidebar: false});
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: 0}), {sidebar: false});
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: 1}), {sidebar: true});
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: true}), {sidebar: true});
    assert.deepStrictEqual(normalizeFrontMatter({sidebar: false}), {sidebar: false});
  });
  it("coerces draft to a boolean", () => {
    assert.deepStrictEqual(normalizeFrontMatter({draft: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({draft: null}), {draft: false});
    assert.deepStrictEqual(normalizeFrontMatter({draft: 0}), {draft: false});
    assert.deepStrictEqual(normalizeFrontMatter({draft: 1}), {draft: true});
    assert.deepStrictEqual(normalizeFrontMatter({draft: true}), {draft: true});
    assert.deepStrictEqual(normalizeFrontMatter({draft: false}), {draft: false});
  });
  it("coerces keywords to an array of strings", () => {
    assert.deepStrictEqual(normalizeFrontMatter({keywords: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: null}), {keywords: []});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: []}), {keywords: []});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: [1, 2]}), {keywords: ["1", "2"]});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: "test"}), {keywords: ["test"]});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: ""}), {keywords: [""]});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: "foo, bar"}), {keywords: ["foo, bar"]});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: [1, "foo"]}), {keywords: ["1", "foo"]});
    assert.deepStrictEqual(normalizeFrontMatter({keywords: new Set([1, "foo"])}), {keywords: ["1", "foo"]});
  });
  it("coerces sql to a Record<string, string>", () => {
    assert.deepStrictEqual(normalizeFrontMatter({sql: undefined}), {});
    assert.deepStrictEqual(normalizeFrontMatter({sql: null}), {sql: {}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: 0}), {sql: {}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: 1}), {sql: {}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: false}), {sql: {}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: {foo: 1}}), {sql: {foo: "1"}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: {foo: null}}), {sql: {foo: "null"}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: {foo: "bar"}}), {sql: {foo: "bar"}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: {foo: []}}), {sql: {foo: ""}});
    assert.deepStrictEqual(normalizeFrontMatter({sql: {foo: {toString: () => "bar"}}}), {sql: {foo: "bar"}});
  });
  it("ignores unknown properties", () => {
    assert.deepStrictEqual(normalizeFrontMatter({foo: 42}), {});
  });
});
