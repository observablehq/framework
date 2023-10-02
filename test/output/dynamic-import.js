define({id: 0, inputs: [], outputs: ["foo"], body: async () => {
const foo = await import("./bar.js");
return {foo};
}});
