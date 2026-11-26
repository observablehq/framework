define({id: "0", inputs: ["display"], outputs: ["data"], body: async (display) => {
const $module = await import("./_import/baz.js");
if (!("data" in $module)) throw new SyntaxError("The requested module './baz.js' does not provide an export named 'data'");
const {data} = $module;

display(data);
return {data};
}});
