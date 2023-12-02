export const fooJsonData = await fetch(import.meta.resolve("../../_file/foo/foo-data.json")).then(d => d.json());
export const fooCsvData = await fetch(import.meta.resolve("../../_file/foo/foo-data.csv")).then(d => d.text());
