define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/bar.js");

display(foo);
return {foo};
}});
