import {Generators} from "observablehq:stdlib";

(async () => {
  for await (const dark of Generators.dark()) {
    const {classList} = document.body;
    classList.toggle("dark", dark);
    classList.toggle("light", !dark);
  }
})();
