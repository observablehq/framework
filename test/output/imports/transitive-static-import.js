define({id: "0", outputs: ["foo"], body: async () => {
const {foo} = await import("./_import/other/foo.js?sha=6fdfbf0a93ff6bcb");
return {foo};
}});
