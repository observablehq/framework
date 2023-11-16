import assert from "node:assert";
import {parseInfo} from "../src/info.js";

describe("parseInfo(input)", () => {
  it("parses bare language tags", () => {
    assert.deepStrictEqual(parseInfo("js"), {tag: "js", attributes: {}});
    assert.deepStrictEqual(parseInfo("javascript"), {tag: "javascript", attributes: {}});
    assert.deepStrictEqual(parseInfo("java_script"), {tag: "java_script", attributes: {}});
    assert.deepStrictEqual(parseInfo("java-script"), {tag: "java-script", attributes: {}});
    assert.deepStrictEqual(parseInfo("$js"), {tag: "$js", attributes: {}});
    assert.deepStrictEqual(parseInfo("#js"), {tag: "#js", attributes: {}});
    assert.deepStrictEqual(parseInfo("{js}"), {tag: "{js}", attributes: {}});
  });
  it("ignores trailing whitespace", () => {
    assert.deepStrictEqual(parseInfo("js "), {tag: "js", attributes: {}});
    assert.deepStrictEqual(parseInfo("js\t"), {tag: "js", attributes: {}});
  });
  it("parses empty string", () => {
    assert.deepStrictEqual(parseInfo(""), {tag: "", attributes: {}});
  });
  it("returns empty tag if leading whitespace", () => {
    assert.deepStrictEqual(parseInfo(" js"), {tag: "", attributes: {js: ""}});
    assert.deepStrictEqual(parseInfo(" show"), {tag: "", attributes: {show: ""}});
  });
  it("parses bare attributes", () => {
    assert.deepStrictEqual(parseInfo("js show"), {tag: "js", attributes: {show: ""}});
    assert.deepStrictEqual(parseInfo("js 3839"), {tag: "js", attributes: {3839: ""}});
    assert.deepStrictEqual(parseInfo("js a b c"), {tag: "js", attributes: {a: "", b: "", c: ""}});
  });
  it("parses unquoted attribute values", () => {
    assert.deepStrictEqual(parseInfo("js show=yes"), {tag: "js", attributes: {show: "yes"}});
    assert.deepStrictEqual(parseInfo("js show=true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show=0"), {tag: "js", attributes: {show: "0"}});
    assert.deepStrictEqual(parseInfo("js show=1"), {tag: "js", attributes: {show: "1"}});
    assert.deepStrictEqual(parseInfo("js show=a,b"), {tag: "js", attributes: {show: "a,b"}});
    assert.deepStrictEqual(parseInfo("js show=2020-01-01"), {tag: "js", attributes: {show: "2020-01-01"}});
    assert.deepStrictEqual(parseInfo("js show=2020_01_02"), {tag: "js", attributes: {show: "2020_01_02"}});
    assert.deepStrictEqual(parseInfo("js show=2020.01.03"), {tag: "js", attributes: {show: "2020.01.03"}});
    assert.deepStrictEqual(parseInfo("js show=2020/01/02"), {tag: "js", attributes: {show: "2020/01/02"}});
    assert.deepStrictEqual(parseInfo("js show=abc$("), {tag: "js", attributes: {show: "abc$("}});
  });
  it("attribute names are terminated by slash or gt", () => {
    assert.deepStrictEqual(parseInfo("js foo/bar"), {tag: "js", attributes: {foo: "", bar: ""}});
    assert.deepStrictEqual(parseInfo("js foo>bar"), {tag: "js", attributes: {foo: "", bar: ""}});
    assert.deepStrictEqual(parseInfo("js foo<bar"), {tag: "js", attributes: {"foo<bar": ""}});
    assert.deepStrictEqual(parseInfo("js foo,bar"), {tag: "js", attributes: {"foo,bar": ""}});
    assert.deepStrictEqual(parseInfo("js foo{bar}"), {tag: "js", attributes: {"foo{bar}": ""}});
    assert.deepStrictEqual(parseInfo("js =foo"), {tag: "js", attributes: {foo: ""}});
    assert.deepStrictEqual(parseInfo("js <foo"), {tag: "js", attributes: {"<foo": ""}});
    assert.deepStrictEqual(parseInfo("js ,foo"), {tag: "js", attributes: {",foo": ""}});
    assert.deepStrictEqual(parseInfo("js {bar}"), {tag: "js", attributes: {"{bar}": ""}});
  });
  it("ignores leading slash or gt at the start of attribute names", () => {
    assert.deepStrictEqual(parseInfo("js /foo"), {tag: "js", attributes: {foo: ""}});
    assert.deepStrictEqual(parseInfo("js >foo"), {tag: "js", attributes: {foo: ""}});
  });
  it("unquoted attribute values are terminated by gt", () => {
    assert.deepStrictEqual(parseInfo("js show=>"), {tag: "js", attributes: {show: ""}});
    assert.deepStrictEqual(parseInfo("js show=abc>"), {tag: "js", attributes: {show: "abc"}});
  });
  it("ignores whitespace around attribute names and unquoted values", () => {
    assert.deepStrictEqual(parseInfo("js show=true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show= true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show = true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js  show =true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show=true "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show= true "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show = true "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js  show =true "), {tag: "js", attributes: {show: "true"}});
  });
  it("ignores whitespace around single-quoted values", () => {
    assert.deepStrictEqual(parseInfo("js show='true'"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show= 'true'"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show = 'true'"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js  show ='true'"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show='true' "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show= 'true' "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show = 'true' "), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js  show ='true' "), {tag: "js", attributes: {show: "true"}});
  });
  it("ignores whitespace around double-quoted values", () => {
    assert.deepStrictEqual(parseInfo('js show="true"'), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show= "true"'), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show = "true"'), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js  show ="true"'), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show="true" '), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show= "true" '), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show = "true" '), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js  show ="true" '), {tag: "js", attributes: {show: "true"}});
  });
  it("treats tabs as whitespace", () => {
    assert.deepStrictEqual(parseInfo("js\tshow=true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js\tshow=\ttrue"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js\tshow\t=\ttrue"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js\tshow\t=true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js\tshow=true\t"), {tag: "js", attributes: {show: "true"}});
  });
  it("preserves the case of attribute values", () => {
    assert.deepStrictEqual(parseInfo("js show=FALSE"), {tag: "js", attributes: {show: "FALSE"}});
    assert.deepStrictEqual(parseInfo("js show=TRUE"), {tag: "js", attributes: {show: "TRUE"}});
    assert.deepStrictEqual(parseInfo("js show=False"), {tag: "js", attributes: {show: "False"}});
    assert.deepStrictEqual(parseInfo("js show=True"), {tag: "js", attributes: {show: "True"}});
    assert.deepStrictEqual(parseInfo("js show=fALsE"), {tag: "js", attributes: {show: "fALsE"}});
    assert.deepStrictEqual(parseInfo("js show=TrUe"), {tag: "js", attributes: {show: "TrUe"}});
  });
  it("parses double-quoted attribute values", () => {
    assert.deepStrictEqual(parseInfo('js show="yes"'), {tag: "js", attributes: {show: "yes"}});
    assert.deepStrictEqual(parseInfo('js show="true"'), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show="1"'), {tag: "js", attributes: {show: "1"}});
    assert.deepStrictEqual(parseInfo('js show="a,b"'), {tag: "js", attributes: {show: "a,b"}});
    assert.deepStrictEqual(parseInfo('js show="<foo>"'), {tag: "js", attributes: {show: "<foo>"}});
  });
  it("parses single-quoted attribute values", () => {
    assert.deepStrictEqual(parseInfo("js show='yes'"), {tag: "js", attributes: {show: "yes"}});
    assert.deepStrictEqual(parseInfo("js show='true'"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo("js show='1'"), {tag: "js", attributes: {show: "1"}});
    assert.deepStrictEqual(parseInfo("js show='a,b'"), {tag: "js", attributes: {show: "a,b"}});
    assert.deepStrictEqual(parseInfo("js show='<foo>'"), {tag: "js", attributes: {show: "<foo>"}});
  });
  it("parses double-quoted strings with single quotes", () => {
    assert.deepStrictEqual(parseInfo("js show=\"hello 'world'\""), {tag: "js", attributes: {show: "hello 'world'"}});
  });
  it("parses single-quoted strings with double quotes", () => {
    assert.deepStrictEqual(parseInfo("js show='hello \"world\"'"), {tag: "js", attributes: {show: 'hello "world"'}});
  });
  // TODO HTML doesn’t do this; you use &quot; to escape. What should we do?
  it.skip("parses quoted strings with escaped quotes", () => {
    assert.deepStrictEqual(parseInfo('js show="hello \\"world\\""'), {tag: "js", attributes: {show: 'hello "world"'}});
    assert.deepStrictEqual(parseInfo("js show='hello \\'world\\''"), {tag: "js", attributes: {show: "hello 'world'"}});
  });
  it.skip("parses attribute values with escaped entites", () => {
    assert.deepStrictEqual(parseInfo("js show=&quot;world&quot;"), {tag: "js", attributes: {show: '"world"'}});
    assert.deepStrictEqual(parseInfo('js show="&quot;world&quot;"'), {tag: "js", attributes: {show: '"world"'}});
    assert.deepStrictEqual(parseInfo("js show='&quot;world&quot;'"), {tag: "js", attributes: {show: '"world"'}});
  });
  it("parses multiple attributes", () => {
    assert.deepStrictEqual(parseInfo(" show=true run"), {tag: "", attributes: {show: "true", run: ""}});
    assert.deepStrictEqual(parseInfo(" show=true run=false"), {tag: "", attributes: {show: "true", run: "false"}});
    assert.deepStrictEqual(parseInfo(' show=true run="false"'), {tag: "", attributes: {show: "true", run: "false"}});
    assert.deepStrictEqual(parseInfo(" a=true b=abc d=efg"), {tag: "", attributes: {a: "true", b: "abc", d: "efg"}});
  });
  it("does not require quoted attribute values to be terminated", () => {
    assert.deepStrictEqual(parseInfo("js show='true"), {tag: "js", attributes: {show: "true"}});
    assert.deepStrictEqual(parseInfo('js show="foo'), {tag: "js", attributes: {show: "foo"}});
  });
  it("when attributes have the same name, the last one wins", () => {
    assert.deepStrictEqual(parseInfo("js show=true show=false"), {tag: "js", attributes: {show: "false"}});
    assert.deepStrictEqual(parseInfo("js show show=false"), {tag: "js", attributes: {show: "false"}});
  });
  it("lowercases attribute names", () => {
    assert.deepStrictEqual(parseInfo(" A=A"), {tag: "", attributes: {a: "A"}});
    assert.deepStrictEqual(parseInfo(" aA=aA"), {tag: "", attributes: {aa: "aA"}});
    assert.deepStrictEqual(parseInfo(" a=a A=A"), {tag: "", attributes: {a: "A"}});
    assert.deepStrictEqual(parseInfo(" aa=aa aA=aA"), {tag: "", attributes: {aa: "aA"}});
  });
  it("lowercases tags", () => {
    assert.deepStrictEqual(parseInfo("JS"), {tag: "js", attributes: {}});
    assert.deepStrictEqual(parseInfo("JavaScript"), {tag: "javascript", attributes: {}});
  });
});
