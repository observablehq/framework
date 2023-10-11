define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_file/bar.js");
return {foo};
}});
