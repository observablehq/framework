define({id: "0", inputs: ["promise","display"], body: async (promise,display) => {
display(await(
await promise
))
}});
