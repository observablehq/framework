define({id: 0, inputs: [], outputs: ["Foo"], body: () => {
class Foo {
  async addAsync(a, b) {
    return (await a) + (await b);
  }
}
return {Foo};
}});
