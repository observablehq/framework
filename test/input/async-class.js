class Foo {
  async addAsync(a, b) {
    return (await a) + (await b);
  }
}
