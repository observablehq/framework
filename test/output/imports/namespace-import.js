define({id: "0", inputs: ["display"], outputs: ["bar"], body: async (display) => {
const bar = await import("./bar.js");

display(bar);
return {bar};
}});
