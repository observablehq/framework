define({id: "0", inputs: ["$module1"], outputs: ["bar","foo","$module0"], body: async ($module1) => {
const [$module0_, $module1_] = await Promise.all([import("./_import/bar.js"), import("./_import/other/foo.js")]);
if (!("foo" in $module1_)) throw new SyntaxError("The requested module './other/foo.js' does not provide an export named 'foo'");
const [bar, {foo}] = [$module0_, $module1_];

const $module0 = foo;
$module0 + $module1 + bar;
return {bar,foo,$module0};
}});
