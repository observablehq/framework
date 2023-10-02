define({id: 0, inputs: [], outputs: ["addAsync"], body: () => {
async function addAsync(a, b) {
  return (await a) + (await b);
}
return {addAsync};
}});
