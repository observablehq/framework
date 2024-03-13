define({id: "0", outputs: ["foo","bar"], body: async () => {
const [{foo}, {bar}] = await Promise.all([import("./foo.js"), import("./bar.js")]);

foo() + bar();
return {foo,bar};
}});
