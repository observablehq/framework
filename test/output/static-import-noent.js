define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/noent.js?sha=e3b0c44298fc1c14");

display(foo);
return {foo};
}});
