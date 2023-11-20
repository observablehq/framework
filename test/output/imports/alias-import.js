define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const {foo: bar} = await import("./_import/bar.js");

display(bar);
return {bar};
}});
