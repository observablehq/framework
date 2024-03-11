define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./noent.js");
return {foo};
}});
