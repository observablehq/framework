define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/bar.js?sha=8f10745526b34eaa");

display(foo);
return {foo};
}});
