define({id: 0, inputs: [], outputs: ["x"], body: () => {
const exports = {};
const x = (exports.x = (function*() {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
})());
return exports;
}});
