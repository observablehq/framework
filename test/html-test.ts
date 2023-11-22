import assert from "node:assert";
import {html} from "../src/html.js";

describe("html(strings, ...values)", () => {
  it("returns an instance of Html", () => {
    assert.deepStrictEqual(html`<b>hello</b>`, html.unsafe("<b>hello</b>"));
  });
  it("stringifies to HTML source", () => {
    assert.deepStrictEqual(String(html`<b>hello</b>`), "<b>hello</b>");
  });
  it("escapes interpolated values, if not instanceof Html", () => {
    assert.deepStrictEqual(String(html`<b>${"dollar&pound"}</b>`), "<b>dollar&amp;pound</b>");
    assert.deepStrictEqual(String(html`<b>${"dollar"}${"&pound"}</b>`), "<b>dollar&amp;pound</b>");
    assert.deepStrictEqual(String(html`${"<script>"}alert()${"</script>"}`), "&lt;script&gt;alert()&lt;/script&gt;");
    assert.deepStrictEqual(String(html`<span name="${"'a'"}">a</span>`), '<span name="&#x27;a&#x27;">a</span>');
    assert.deepStrictEqual(String(html`<span name="${'"b"'}">b</span>`), '<span name="&quot;b&quot;">b</span>');
    assert.deepStrictEqual(String(html`<span name="${"`c`"}">c</span>`), '<span name="&#x60;c&#x60;">c</span>');
  });
  it("is not raw", () => {
    assert.deepStrictEqual(String(html`<b>\new{42}</b>`), "<b>\new{42}</b>");
  });
  it("coerces interpolated values to strings, if not instanceof Html", () => {
    assert.deepStrictEqual(String(html`<b>${{toString: () => 42}}</b>`), "<b>42</b>");
  });
  it("concatenates iterables", () => {
    assert.deepStrictEqual(String(html`<b>${[1, 2, 3]}</b>`), "<b>123</b>");
    assert.deepStrictEqual(String(html`<b>${new Set([1, 2, 3])}</b>`), "<b>123</b>");
    assert.deepStrictEqual(String(html`<b>${["dollar", "&pound"]}</b>`), "<b>dollar&amp;pound</b>");
  });
  it("ignores null and undefined", () => {
    assert.deepStrictEqual(String(html`<b>${null}</b>`), "<b></b>");
    assert.deepStrictEqual(String(html`<b>${undefined}</b>`), "<b></b>");
  });
  it("does not escape interpolated values if instanceof Html", () => {
    assert.deepStrictEqual(String(html`<b>${html`dollar&pound`}</b>`), "<b>dollar&pound</b>");
    assert.deepStrictEqual(String(html`<b>${html.unsafe(`dollar&pound`)}</b>`), "<b>dollar&pound</b>");
  });
});
