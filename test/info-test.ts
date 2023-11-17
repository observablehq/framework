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
    assert.deepStrictEqual(parseInfo(" echo"), {tag: "", attributes: {echo: ""}});
  });
  it("parses bare attributes", () => {
    assert.deepStrictEqual(parseInfo("js echo"), {tag: "js", attributes: {echo: ""}});
    assert.deepStrictEqual(parseInfo("js 3839"), {tag: "js", attributes: {3839: ""}});
    assert.deepStrictEqual(parseInfo("js a b c"), {tag: "js", attributes: {a: "", b: "", c: ""}});
  });
  it("parses unquoted attribute values", () => {
    assert.deepStrictEqual(parseInfo("js echo=yes"), {tag: "js", attributes: {echo: "yes"}});
    assert.deepStrictEqual(parseInfo("js echo=true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo=0"), {tag: "js", attributes: {echo: "0"}});
    assert.deepStrictEqual(parseInfo("js echo=1"), {tag: "js", attributes: {echo: "1"}});
    assert.deepStrictEqual(parseInfo("js echo=a,b"), {tag: "js", attributes: {echo: "a,b"}});
    assert.deepStrictEqual(parseInfo("js echo=2020-01-01"), {tag: "js", attributes: {echo: "2020-01-01"}});
    assert.deepStrictEqual(parseInfo("js echo=2020_01_02"), {tag: "js", attributes: {echo: "2020_01_02"}});
    assert.deepStrictEqual(parseInfo("js echo=2020.01.03"), {tag: "js", attributes: {echo: "2020.01.03"}});
    assert.deepStrictEqual(parseInfo("js echo=2020/01/02"), {tag: "js", attributes: {echo: "2020/01/02"}});
    assert.deepStrictEqual(parseInfo("js echo=abc$("), {tag: "js", attributes: {echo: "abc$("}});
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
    assert.deepStrictEqual(parseInfo("js echo=>"), {tag: "js", attributes: {echo: ""}});
    assert.deepStrictEqual(parseInfo("js echo=abc>"), {tag: "js", attributes: {echo: "abc"}});
  });
  it("ignores whitespace around attribute names and unquoted values", () => {
    assert.deepStrictEqual(parseInfo("js echo=true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo= true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo = true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js  echo =true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo=true "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo= true "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo = true "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js  echo =true "), {tag: "js", attributes: {echo: "true"}});
  });
  it("ignores whitespace around single-quoted values", () => {
    assert.deepStrictEqual(parseInfo("js echo='true'"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo= 'true'"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo = 'true'"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js  echo ='true'"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo='true' "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo= 'true' "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo = 'true' "), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js  echo ='true' "), {tag: "js", attributes: {echo: "true"}});
  });
  it("ignores whitespace around double-quoted values", () => {
    assert.deepStrictEqual(parseInfo('js echo="true"'), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo= "true"'), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo = "true"'), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js  echo ="true"'), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo="true" '), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo= "true" '), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo = "true" '), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js  echo ="true" '), {tag: "js", attributes: {echo: "true"}});
  });
  it("treats tabs as whitespace", () => {
    assert.deepStrictEqual(parseInfo("js\techo=true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js\techo=\ttrue"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js\techo\t=\ttrue"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js\techo\t=true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js\techo=true\t"), {tag: "js", attributes: {echo: "true"}});
  });
  it("preserves the case of attribute values", () => {
    assert.deepStrictEqual(parseInfo("js echo=FALSE"), {tag: "js", attributes: {echo: "FALSE"}});
    assert.deepStrictEqual(parseInfo("js echo=TRUE"), {tag: "js", attributes: {echo: "TRUE"}});
    assert.deepStrictEqual(parseInfo("js echo=False"), {tag: "js", attributes: {echo: "False"}});
    assert.deepStrictEqual(parseInfo("js echo=True"), {tag: "js", attributes: {echo: "True"}});
    assert.deepStrictEqual(parseInfo("js echo=fALsE"), {tag: "js", attributes: {echo: "fALsE"}});
    assert.deepStrictEqual(parseInfo("js echo=TrUe"), {tag: "js", attributes: {echo: "TrUe"}});
  });
  it("parses double-quoted attribute values", () => {
    assert.deepStrictEqual(parseInfo('js echo="yes"'), {tag: "js", attributes: {echo: "yes"}});
    assert.deepStrictEqual(parseInfo('js echo="true"'), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo="1"'), {tag: "js", attributes: {echo: "1"}});
    assert.deepStrictEqual(parseInfo('js echo="a,b"'), {tag: "js", attributes: {echo: "a,b"}});
    assert.deepStrictEqual(parseInfo('js echo="<foo>"'), {tag: "js", attributes: {echo: "<foo>"}});
  });
  it("parses single-quoted attribute values", () => {
    assert.deepStrictEqual(parseInfo("js echo='yes'"), {tag: "js", attributes: {echo: "yes"}});
    assert.deepStrictEqual(parseInfo("js echo='true'"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo("js echo='1'"), {tag: "js", attributes: {echo: "1"}});
    assert.deepStrictEqual(parseInfo("js echo='a,b'"), {tag: "js", attributes: {echo: "a,b"}});
    assert.deepStrictEqual(parseInfo("js echo='<foo>'"), {tag: "js", attributes: {echo: "<foo>"}});
  });
  it("parses double-quoted strings with single quotes", () => {
    assert.deepStrictEqual(parseInfo("js echo=\"hello 'world'\""), {tag: "js", attributes: {echo: "hello 'world'"}});
  });
  it("parses single-quoted strings with double quotes", () => {
    assert.deepStrictEqual(parseInfo("js echo='hello \"world\"'"), {tag: "js", attributes: {echo: 'hello "world"'}});
  });
  it("parses attribute values with escaped entites", () => {
    assert.deepStrictEqual(parseInfo("js echo=&quot;world&quot;"), {tag: "js", attributes: {echo: '"world"'}});
    assert.deepStrictEqual(parseInfo('js echo="&quot;world&quot;"'), {tag: "js", attributes: {echo: '"world"'}});
    assert.deepStrictEqual(parseInfo("js echo='&quot;world&quot;'"), {tag: "js", attributes: {echo: '"world"'}});
  });
  it("parses attribute values with ambiguous ampersands", () => {
    assert.deepStrictEqual(parseInfo("js echo=foo&ampbar"), {tag: "js", attributes: {echo: "foo&ampbar"}});
    assert.deepStrictEqual(parseInfo("js echo=foo&amp;bar"), {tag: "js", attributes: {echo: "foo&bar"}});
  });
  it("parses multiple attributes", () => {
    assert.deepStrictEqual(parseInfo(" echo=true run"), {tag: "", attributes: {echo: "true", run: ""}});
    assert.deepStrictEqual(parseInfo(" echo=true run=false"), {tag: "", attributes: {echo: "true", run: "false"}});
    assert.deepStrictEqual(parseInfo(' echo=true run="false"'), {tag: "", attributes: {echo: "true", run: "false"}});
    assert.deepStrictEqual(parseInfo(" a=true b=abc d=efg"), {tag: "", attributes: {a: "true", b: "abc", d: "efg"}});
  });
  it("does not require quoted attribute values to be terminated", () => {
    assert.deepStrictEqual(parseInfo("js echo='true"), {tag: "js", attributes: {echo: "true"}});
    assert.deepStrictEqual(parseInfo('js echo="foo'), {tag: "js", attributes: {echo: "foo"}});
  });
  it("when attributes have the same name, the last one wins", () => {
    assert.deepStrictEqual(parseInfo("js echo=true echo=false"), {tag: "js", attributes: {echo: "false"}});
    assert.deepStrictEqual(parseInfo("js echo echo=false"), {tag: "js", attributes: {echo: "false"}});
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
