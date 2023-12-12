define({id: "0", inputs: ["foo","display"], body: async (foo,display) => {
display(await(
foo
))
}});
