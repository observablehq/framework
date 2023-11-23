define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_import/noent.js?sha=e3b0c44298fc1c14");
return {foo};
}});
