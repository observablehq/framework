import {parseArgs} from "node:util";

const {
  values: {dir}
} = parseArgs({
  options: {dir: {type: "string"}}
});

console.log(`# Hello ${dir}

I can also refer to it dynamically as $\{observable.params.dir}.

But not sure why I would do that over ${dir}.

~~~js
1 + observable.params.dir
~~~

~~~js
1 + ${JSON.stringify(dir)}
~~~

`);
