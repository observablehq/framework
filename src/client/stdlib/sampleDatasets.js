export const aapl = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/aapl.csv"), true);
export const alphabet = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/alphabet.csv"), true);
export const cars = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/cars.csv"), true);
export const citywages = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/citywages.csv"), true);
export const diamonds = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/diamonds.csv"), true);
export const flare = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/flare.csv"), true);
export const industries = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/industries.csv"), true);
export const miserables = () => json(import.meta.resolve("npm:@observablehq/sample-datasets/miserables.json"));
export const olympians = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/olympians.csv"), true);
export const penguins = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/penguins.csv"), true);
export const pizza = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/pizza.csv"), true);
export const weather = () => csv(import.meta.resolve("npm:@observablehq/sample-datasets/weather.csv"), true);

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`unable to fetch ${url}: status ${response.status}`);
  return response.json();
}

async function text(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`unable to fetch ${url}: status ${response.status}`);
  return response.text();
}

async function csv(url, typed) {
  const [contents, d3] = await Promise.all([text(url), import("npm:d3-dsv")]);
  return d3.csvParse(contents, typed && d3.autoType);
}
