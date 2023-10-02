define({id: 0, inputs: [], outputs: ["addAsync"], body: () => {
const addAsync = async (a, b) => (await a) + (await b);
return {addAsync};
}});
