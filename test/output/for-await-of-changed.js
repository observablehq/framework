define({id: 0, inputs: ["foo"], outputs: ["values"], body: async (foo) => {
const values = [];
for await (const value of foo()) values.push(value);
return {values};
}});
