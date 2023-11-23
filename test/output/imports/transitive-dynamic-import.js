define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./_import/other/foo.js?sha=60cddee6dcefdbc9");
return {foo};
}});
