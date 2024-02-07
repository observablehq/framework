define({id: "0", inputs: ["display"], outputs: ["data"], files: [{"name":"./fetch-local-data.json","mimeType":"application/json","path":"./_file/fetch-local-data.json","lastModified":1701883559359}], body: async (display) => {
const {data} = await import("./_import/baz.js?sha=065e1149636e2894e471ad52d5be266d0b2ff7bbd7d982832d09f7b367ff8480");

display(data);
return {data};
}});
