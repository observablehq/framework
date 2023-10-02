define({id: 0, inputs: [], outputs: ["foo"], body: () => {
const exports = {};
function foo() { return arguments.length; }
exports.foo = foo;
return exports;
}});
