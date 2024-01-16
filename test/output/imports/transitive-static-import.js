define({id: "0", outputs: ["foo"], body: async () => {
const {foo} = await import("./_import/other/foo.js?sha=60cddee6dcefdbc921c205af4e0b2b0406d5aed1a0624d55415b4e09337542ad");

return {foo};
}});
