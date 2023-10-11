define({id: "0", outputs: ["foo"], body: () => {
const foo = null ?? "default string";
return {foo};
}});
