define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_import/bar.js");
return {foo};
}});
