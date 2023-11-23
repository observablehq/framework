define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/bar.js?sha=9331503318064ac5");

display(foo);
return {foo};
}});
