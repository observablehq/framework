export default {
  async *dynamicPaths() {
    yield* ["/bar/index", "/foo/bar", "/foo/index"];
  }
};
