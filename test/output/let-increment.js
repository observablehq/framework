define({id: 0, inputs: [], outputs: ["x"], body: () => {
const exports = {};
let x = (exports.x = 0);
(++x, exports.x = x);
(x++, exports.x = x);
return exports;
}});
