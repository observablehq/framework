export default {
  async *dynamicPaths() {
    yield* ["/bar/index", "/bar/loaded", "/foo/bar", "/foo/index"];
  }
};
