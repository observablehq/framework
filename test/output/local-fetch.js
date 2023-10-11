
define({id: 1, inputs: ["display"], files: [{"name":"./local-fetch.md","mimeType":"text/markdown"}], body: (display) => {
display((
fetch("./_file/local-fetch.md")
))
}});
