# Hello dynamic route

is it working

```js
display(await FileAttachment("./foo.txt").text());
```

```js
display(await FileAttachment("./foo.json").json());
```

```js
display(await FileAttachment("./file.json").json());
```

```js
import {foo} from "./foo.js";

display(foo);
```

```js
display(`${observable.params.dir}.json`);
```

```js
display(await FileAttachment("./" + observable.params.dir + ".json").json());
```

<img src="./w3c.png">
