import {parseArgs} from "node:util";

const {values} = parseArgs({
  options: {
    test: {
      type: "string"
    }
  }
});

console.log(values.test);
