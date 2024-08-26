# Hello dynamic route

is it working ${observable.params.dir}

```js
FileAttachment("./foo.txt").text()
```

```js
FileAttachment("./foo.json").json()
```

```js
FileAttachment("./file.json").json()
```

```js
import {foo} from "./foo.js";

display(foo);
```

```js
`${observable.params.dir}.json`
```

```js
FileAttachment(`./${observable.params.dir}.json`).json()
```

```js
FileAttachment("./" + observable.params.dir + ".json").json()
```

<img src="./w3c.png">
