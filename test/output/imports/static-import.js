define({id: "0", inputs: ["display"], outputs: ["foo"], files: [{"name":"bar.js","mimeType":"application/javascript"}], body: async (display) => {
const {foo} = await import("/_file/bar.js");

display(foo);
return {foo};
}});
