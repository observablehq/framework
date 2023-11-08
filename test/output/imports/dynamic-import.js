define({id: "0", outputs: ["foo"], files: [{"name":"bar.js","mimeType":"application/javascript"}], body: async () => {
const foo = await import("/_file/bar.js");
return {foo};
}});
