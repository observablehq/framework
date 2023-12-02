export {fooCsvData, fooJsonData} from "./foo/foo.js?sha=7a93b271ec78dd07db6d9265e7b82eacc1a1bb6682cd665f0f86ea2c0fbc7350";
export const topJsonData = await fetch(import.meta.resolve("../_file/top-data.json")).then(d => d.json());
export const topCsvData = await fetch(import.meta.resolve("../_file/top-data.csv")).then(d => d.csv({ typed: true }));
