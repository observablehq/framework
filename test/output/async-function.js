define({id: "0", outputs: ["addAsync"], body: () => {
async function addAsync(a, b) {
  return (await a) + (await b);
}
return {addAsync};
}});
