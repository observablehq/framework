define({id: "0", outputs: ["d","ab","foo"], body: async () => {
const $module = await import("./_import/bar.js");
if (!("default" in $module)) throw new SyntaxError("The requested module './bar.js' does not provide an export named 'default'");
if (!("a-b" in $module)) throw new SyntaxError("The requested module './bar.js' does not provide an export named 'a-b'");
if (!("foo" in $module)) throw new SyntaxError("The requested module './bar.js' does not provide an export named 'foo'");
const {default: d, "a-b": ab, foo} = $module;

d(ab(foo));
return {d,ab,foo};
}});
