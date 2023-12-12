define({id: "0", inputs: ["display"], body: async (display) => {
display(await(
{a: 1}
))
}});
