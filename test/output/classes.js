define({id: 0, inputs: [], outputs: ["Foo","Bar"], body: () => {
const exports = {};
class Foo {}
exports.Foo = Foo;
class Bar {}
exports.Bar = Bar;
return exports;
}});
