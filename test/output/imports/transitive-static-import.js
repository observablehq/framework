define({id: "0", outputs: ["foo"], body: async () => {
const $module = await import("./_import/other/foo.js");
if (!("foo" in $module)) throw new SyntaxError("The requested module './other/foo.js' does not provide an export named 'foo'");
const {foo} = $module;

return {foo};
}});
