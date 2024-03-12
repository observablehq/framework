import assert from "node:assert";
import {createHash} from "node:crypto";
import {findAssets, html, rewriteHtml} from "../src/html.js";

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
    assert.deepStrictEqual(String(html`<b>${[1, 2, null, 3]}</b>`), "<b>123</b>");
    assert.deepStrictEqual(String(html`<b>${new Set([1, 2, null, 3])}</b>`), "<b>123</b>");
    assert.deepStrictEqual(String(html`<b>${["dollar", "&pound"]}</b>`), "<b>dollar&amp;pound</b>");
    assert.deepStrictEqual(String(html`<b>${["dollar", html`&pound`]}</b>`), "<b>dollar&pound</b>");
  });
  it("ignores null and undefined", () => {
    assert.deepStrictEqual(String(html`<b>${null}</b>`), "<b></b>");
    assert.deepStrictEqual(String(html`<b>${undefined}</b>`), "<b></b>");
  });
  it("does not escape interpolated values if instanceof Html", () => {
    assert.deepStrictEqual(String(html`<b>${html`dollar&pound`}</b>`), "<b>dollar&pound</b>");
    assert.deepStrictEqual(String(html`<b>${html.unsafe("dollar&pound")}</b>`), "<b>dollar&pound</b>");
  });
});

describe("findAssets(html, path)", () => {
  it("finds local files from img[src]", () => {
    const html = '<img src="./test.png">';
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./test.png"]));
  });
  it("finds local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, large.jpg 800w" sizes="(max-width: 600px) 480px, 800px" src="large.jpg" alt="Image for testing">'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./large.jpg", "./small.jpg"]));
  });
  it("finds local files from video[src]", () => {
    const html = '<video src="observable.mov" controls></video>'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./observable.mov"]));
  });
  it("finds local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="observable.mp4" type="video/mp4"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./observable.mp4", "./observable.mov"]));
  });
  it("finds local files from picture source[srcset]", () => {
    const html = '<picture><source srcset="observable-logo-wide.png" media="(min-width: 600px)"><img src="observable-logo-narrow.png"></picture>'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./observable-logo-narrow.png", "./observable-logo-wide.png"])); // prettier-ignore
  });
  it("ignores non-local files from img[src]", () => {
    const html = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Shorthair.jpg/900px-American_Shorthair.jpg">'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set());
  });
  it("ignores non-local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./small.jpg"]));
  });
  it("ignores non-local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    assert.deepStrictEqual(findAssets(html, "foo"), new Set(["./observable.mov"]));
  });
});

describe("rewriteHtml(html, resolve)", () => {
  const resolve = (s: string) => (/^\w+:/.test(s) ? s : `${s}?sha=${createHash("sha256").update(s).digest("hex")}`);
  it("rewrites local files from img[src]", () => {
    const html = '<img src="./test.png">';
    const expected = '<img src="./test.png?sha=6189e1c84e5c3a2ccbc916f3d1d6fef48db7a1bec53153b3d3725ca49cd62436">';
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("rewrites local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, large.jpg 800w" sizes="(max-width: 600px) 480px, 800px" src="large.jpg" alt="Image for testing">'; // prettier-ignore
    const expected = '<img srcset="small.jpg?sha=2885b3e6b0b5bb5699bbe54c1e7ee3284bba74312af5f63b51cfdf43535b19e8 480w, large.jpg?sha=22c3cf923c354764ad1a1bc0aa8e5f9b52829c525145c266c9127a5fdd30091e 800w" sizes="(max-width: 600px) 480px, 800px" src="large.jpg?sha=22c3cf923c354764ad1a1bc0aa8e5f9b52829c525145c266c9127a5fdd30091e" alt="Image for testing">'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("rewrites local files from video[src]", () => {
    const html = '<video src="observable.mov" controls></video>'; // prettier-ignore
    const expected = '<video src="observable.mov?sha=e9864d5e85a350487f7283e3b82deb9253ea67bb93f3155a0c45f4988ad1c674" controls=""></video>'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("rewrites local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="observable.mp4" type="video/mp4"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    const expected = '<video width="320" height="240" controls=""><source src="observable.mp4?sha=fc2705f5cf20b095dcdf7a98735d1fc1f6204efac98c6d97dbe2d0b9eb6d8bb7" type="video/mp4"><source src="observable.mov?sha=e9864d5e85a350487f7283e3b82deb9253ea67bb93f3155a0c45f4988ad1c674" type="video/mov"></video>'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("rewrites local files from picture source[srcset]", () => {
    const html = '<picture><source srcset="observable-logo-wide.png" media="(min-width: 600px)"><img src="observable-logo-narrow.png"></picture>'; // prettier-ignore
    const expected = '<picture><source srcset="observable-logo-wide.png?sha=7ff2bc1caec7fee511b629d788853b92ef8c0d5d06a758c28785591555a25b20" media="(min-width: 600px)"><img src="observable-logo-narrow.png?sha=cc8f8b74a03412a19db51b56a04c832c6bf5e723e644924b766c39261578dc80"></picture>'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("ignores non-local files from img[src]", () => {
    const html = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Shorthair.jpg/900px-American_Shorthair.jpg">'; // prettier-ignore
    const expected = html;
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("ignores non-local files from img[srcset]", () => {
    const html = '<img srcset="small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">'; // prettier-ignore
    const expected = '<img srcset="small.jpg?sha=2885b3e6b0b5bb5699bbe54c1e7ee3284bba74312af5f63b51cfdf43535b19e8 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
  it("ignores non-local files from video source[src]", () => {
    const html = '<video width="320" height="240" controls><source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"><source src="observable.mov" type="video/mov"></video>'; // prettier-ignore
    const expected = '<video width="320" height="240" controls=""><source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"><source src="observable.mov?sha=e9864d5e85a350487f7283e3b82deb9253ea67bb93f3155a0c45f4988ad1c674" type="video/mov"></video>'; // prettier-ignore
    assert.strictEqual(rewriteHtml(html, resolve), expected);
  });
});
