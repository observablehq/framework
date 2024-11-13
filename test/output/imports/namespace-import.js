define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const bar = await import("./_import/bar.js"/* observablehq-file */);

display(bar);
return {bar};
}});
