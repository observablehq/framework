define({id: "0", outputs: ["foo","bar"], body: async () => {
const [{foo}, {bar}] = await Promise.all([import("./_import/foo.js"/* observablehq-file */), import("./_import/bar.js"/* observablehq-file */)]);

foo() + bar();
return {foo,bar};
}});
