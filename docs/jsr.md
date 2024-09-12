# Look, Ma! JSR imports!

```js echo
import {yassify} from "jsr:@kwhinnery/yassify";

display(yassify("hello"));
```

```ts echo
import {BinarySearchTree} from "jsr:@std/data-structures@1";

const values = [3, 10, 13, 4, 6, 7, 1, 14];
const tree = new BinarySearchTree<number>();
values.forEach((value) => tree.insert(value));

display(tree.min());
display(tree.max());
display(tree.find(42));
display(tree.find(7));
display(tree.remove(42));
display(tree.remove(7));
```

```js echo
import * as cases from "jsr:@luca/cases";

display(cases.splitPieces("helloWorld")); // ["hello", "world"]
display(cases.camelCase("hello world")); // "helloWorld"
display(cases.snakeCase("helloWorld")); // "hello_world"
display(cases.kebabCase("hello_world")); // "hello-world"
display(cases.titleCase("hello-world")); // "Hello World"
display(cases.pascalCase(["hello", "world"])); // "HelloWorld"
display(cases.constantCase("hello world")); // "HELLO_WORLD"
```

```js echo
import {detect} from "jsr:@luca/runtime-detector";

display(detect()); // "browser"
```

```js echo
import {printProgress} from "jsr:@luca/flag";

printProgress();
```

```js echo
import.meta.resolve("jsr:@luca/flag")
```

```js echo
import {decode} from "jsr:@quentinadam/hex";

display(decode("000102"));
```

```js echo
import * as oak from "jsr:@oak/oak";

display(oak);
```
