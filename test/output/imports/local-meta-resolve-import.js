define({id: "0", outputs: ["foo"], body: () => {
const foo = new URL("./_import/foo.js", location).href;
return {foo};
}});
