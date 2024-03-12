define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./noent.js");

display(foo);
return {foo};
}});
