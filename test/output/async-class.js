define({id: "0", outputs: ["Foo"], body: () => {
class Foo {
  async addAsync(a, b) {
    return (await a) + (await b);
  }
}
return {Foo};
}});
