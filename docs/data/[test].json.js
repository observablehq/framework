import {parseArgs} from "node:util";

const {values} = parseArgs({
  options: {
    test: {
      type: "string"
    }
  }
});

console.log(JSON.stringify(values));
