define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("/_file/noent.js");
return {foo};
}});
