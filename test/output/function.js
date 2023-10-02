define({id: 0, inputs: [], outputs: ["add"], body: () => {
const exports = {};
function add(a, b) {
  return a + b;
}
exports.add = add;
return exports;
}});
