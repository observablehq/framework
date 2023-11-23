define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const {foo: bar} = await import("./_import/bar.js?sha=8f10745526b34eaa");

display(bar);
return {bar};
}});
