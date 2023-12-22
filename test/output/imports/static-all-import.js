define({id: "0", outputs: ["foo","bar"], body: async () => {
const [{foo}, {bar}] = await Promise.all([import("./_import/foo.js?sha=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"), import("./_import/bar.js?sha=9331503318064ac5c6f753abb6d1dc8da6a9a10b8c784265bd5507fcff26f1c3")]);

foo() + bar();
return {foo,bar};
}});
