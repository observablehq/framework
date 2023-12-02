define({id: "0", inputs: ["display"], outputs: ["data"], files: [{"name":"./fetch-local-data.json","mimeType":"application/json","path":"./_file/fetch-local-data.json"}], body: async (display) => {
const {data} = await import("./_import/baz.js?sha=d0d8f0ff6026e6ea38567ddddbed743ad590d44a3e3bb881490a53127609cfc2");

display(data);
return {data};
}});
