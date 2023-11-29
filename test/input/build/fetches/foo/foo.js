export const fooJsonData = await fetch("./foo-data.json").then(d => d.json());
export const fooCsvData = await fetch("./foo-data.csv").then(d => d.csv({ typed: true }));
