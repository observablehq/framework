define({id: 0, inputs: [], outputs: ["x"], body: () => {
const exports = {};
let x;
x = (exports.x = 1);
x = (exports.x = 2);
return exports;
}});
