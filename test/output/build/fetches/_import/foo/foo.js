export const fooJsonData = await fetch(new URL("../../_file/foo/foo-data.json", import.meta.url)).then(d => d.json());
export const fooCsvData = await fetch(new URL("../../_file/foo/foo-data.csv", import.meta.url)).then(d => d.text());
