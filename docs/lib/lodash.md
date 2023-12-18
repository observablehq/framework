# Lodash

[Lodash](https://lodash.com) is a “utility library delivering modularity, performance & extras.” It is available by default in Markdown as `_` but you can import it explicitly like so:

```js echo
import _ from "npm:lodash";
```

```js echo
_.defaults({a: 1}, {a: 3, b: 2})
```

```js echo
_.partition([1, 2, 3, 4], (n) => n % 2)
```
