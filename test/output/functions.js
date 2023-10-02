define({id: 0, inputs: [], outputs: ["add","subtract"], body: () => {
const exports = {};
function add(a, b) {
  return a + b;
}
exports.add = add;

function subtract(a, b) {
  return a - b;
}
exports.subtract = subtract;
return exports;
}});
