export const fooJsonData = await fetch("../_file/foo/foo-data.json").then(d => d.json());
export const fooCsvData = await fetch("../_file/foo/foo-data.csv").then(d => d.csv({ typed: true }));
