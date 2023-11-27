define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/noent.js?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

display(foo);
return {foo};
}});
