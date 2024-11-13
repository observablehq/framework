define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/noent.js"/* observablehq-file */);

display(foo);
return {foo};
}});
