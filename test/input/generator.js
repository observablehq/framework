const x = (function*() {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
})();
