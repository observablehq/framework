define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./bar.js");

display(foo);
return {foo};
}});
