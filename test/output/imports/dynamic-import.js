define({id: "0", outputs: ["foo"], body: async () => {
const foo = await import("./bar.js");
return {foo};
}});
