define({id: 0, inputs: [], outputs: ["x","y"], body: () => {
const exports = {};
const x = (exports.x = 1), y = (exports.y = 2);
return exports;
}});
