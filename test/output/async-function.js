define({id: 0, inputs: [], outputs: ["addAsync"], body: () => {
const exports = {};
async function addAsync(a, b) {
  return (await a) + (await b);
}
exports.addAsync = addAsync;
return exports;
}});
