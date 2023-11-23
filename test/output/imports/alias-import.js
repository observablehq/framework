define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const {foo: bar} = await import("./_import/bar.js?sha=9331503318064ac5");

display(bar);
return {bar};
}});
