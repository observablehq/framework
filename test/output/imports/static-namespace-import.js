define({id: "0", outputs: ["bar","foo"], body: async () => {
const [$module0, $module1] = await Promise.all([import("./_import/bar.js"), import("./_import/other/foo.js")]);
if (!("foo" in $module1)) throw new SyntaxError("The requested module './other/foo.js' does not provide an export named 'foo'");
const [bar, {foo}] = [$module0, $module1];

bar.foo(foo);
return {bar,foo};
}});
