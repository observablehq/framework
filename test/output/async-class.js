define({id: 0, inputs: [], outputs: ["Foo"], body: () => {
const exports = {};
class Foo {
  async addAsync(a, b) {
    return (await a) + (await b);
  }
}
exports.Foo = Foo;
return exports;
}});
