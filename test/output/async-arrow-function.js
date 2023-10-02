define({id: 0, inputs: [], outputs: ["addAsync"], body: () => {
const exports = {};
const addAsync = (exports.addAsync = async (a, b) => (await a) + (await b));
return exports;
}});
