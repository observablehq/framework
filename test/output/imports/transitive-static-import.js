define({id: "0", outputs: ["foo"], body: async () => {
const {foo} = await import("./_import/other/foo.js");

return {foo};
}});
