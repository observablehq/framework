define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("/_file/other/foo.js");
return {foo};
}});
