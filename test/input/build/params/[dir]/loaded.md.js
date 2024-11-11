import {parseArgs} from "node:util";

const {
  values: {dir}
} = parseArgs({
  options: {dir: {type: "string"}}
});

process.stdout.write(`# Hello ${dir}

~~~js
observable.params.dir
~~~
`);
