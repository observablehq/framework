define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_import/bar.js?sha=9331503318064ac5");
return {foo};
}});
