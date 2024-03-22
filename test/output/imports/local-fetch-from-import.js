define({id: "0", inputs: ["display"], outputs: ["data"], body: async (display) => {
const {data} = await import("./baz.js");

display(data);
return {data};
}});
