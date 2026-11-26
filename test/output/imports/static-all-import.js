define({id: "0", outputs: ["foo","bar"], body: async () => {
const [$module0, $module1] = await Promise.all([import("./_import/foo.js"), import("./_import/bar.js")]);
if (!("foo" in $module0)) throw new SyntaxError("The requested module './foo.js' does not provide an export named 'foo'");
if (!("bar" in $module1)) throw new SyntaxError("The requested module './bar.js' does not provide an export named 'bar'");
const [{foo}, {bar}] = [$module0, $module1];

foo() + bar();
return {foo,bar};
}});
