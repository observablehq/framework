define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const $module = await import("./_import/noent.js");
if (!("foo" in $module)) throw new SyntaxError("The requested module './noent.js' does not provide an export named 'foo'");
const {foo} = $module;

display(foo);
return {foo};
}});
