define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const $module = await import("./_import/bar.js");
if (!("foo" in $module)) throw new SyntaxError("The requested module './bar.js' does not provide an export named 'foo'");
const {foo: bar} = $module;

display(bar);
return {bar};
}});
