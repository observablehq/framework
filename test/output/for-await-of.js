define({id: 0, inputs: ["foo"], outputs: ["values"], body: (foo) => {
const exports = {};
const values = (exports.values = []);
for await (const value of foo()) values.push(value);
return exports;
}});
