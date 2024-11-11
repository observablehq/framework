define({id: "0", outputs: ["foo"], body: () => {
const foo = new URL("./_file/fetch-local-data.json", location).href;
return {foo};
}});
