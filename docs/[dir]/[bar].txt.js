import {parseArgs} from "node:util";

const {values} = parseArgs({
  options: {
    dir: {
      type: "string"
    },
    bar: {
      type: "string"
    }
  }
});

console.log(JSON.stringify(values));
