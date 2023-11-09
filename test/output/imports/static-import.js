define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("/_file/bar.js");

display(foo);
return {foo};
}});
