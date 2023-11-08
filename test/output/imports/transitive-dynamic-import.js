define({id: "0", outputs: ["foo"], files: [{"name":"other/foo.js","mimeType":"application/javascript"},{"name":"bar.js","mimeType":"application/javascript"}], body: async () => {
const foo = await import("/_file/other/foo.js");
return {foo};
}});
