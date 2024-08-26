import {parseArgs} from "node:util";

const {
  values: {test}
} = parseArgs({
  options: {test: {type: "string"}}
});

console.log(JSON.stringify({test}));
