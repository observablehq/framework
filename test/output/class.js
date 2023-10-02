define({id: 0, inputs: [], outputs: ["Foo"], body: () => {
const exports = {};
class Foo {}
exports.Foo = Foo;
return exports;
}});
