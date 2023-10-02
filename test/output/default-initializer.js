define({id: 0, inputs: ["x"], outputs: ["fun"], body: (x) => {
const exports = {};
function fun(foo = x) {}
exports.fun = fun;
return exports;
}});
