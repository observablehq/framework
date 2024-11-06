import {Generators} from "observablehq:stdlib";

for await (const dark of Generators.dark()) {
  const {classList} = document.body;
  classList.toggle("dark", dark);
  classList.toggle("light", !dark);
}
