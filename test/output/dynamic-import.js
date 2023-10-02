define({id: 0, inputs: [], outputs: ["foo"], body: async () => {
const exports = {};
const foo = (exports.foo = await import("./bar.js"));
return exports;
}});
