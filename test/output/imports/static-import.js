define({id: "0", inputs: ["display"], outputs: ["foo"], body: async (display) => {
const {foo} = await import("./_import/bar.js?sha=9331503318064ac5c6f753abb6d1dc8da6a9a10b8c784265bd5507fcff26f1c3");

display(foo);
return {foo};
}});
