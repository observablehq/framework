define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_import/bar.js?sha=8f10745526b34eaa");
return {foo};
}});
