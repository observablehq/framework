define({id: 0, inputs: [], outputs: ["foo"], body: () => {
const foo = null ?? "default string";
return {foo};
}});
