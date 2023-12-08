define({id: "0", inputs: ["display"], body: async (display) => {
display(await(
function() { return 42; }
))
}});
