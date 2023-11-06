# Parent dir

Trying to fetch from the parent directory should fail.

```js
const fail1 = fetch("../NOENT.md").then(d => d.text())
```

```js
const fail2 = FileAttachment("../NOENT.md").text()
```

```js
const fail3 = fetch("../README.md").then(d => d.text())
```

```js
const fail4 = FileAttachment("../README.md").text()
```

```js
const fail5 = fetch("./NOENT.md").then(d => d.text())
```

```js
const fail6 = FileAttachment("./NOENT.md").text()
```

```js
const ok1 = fetch("./tex-expression.md").then(d => d.text())
```

```js
const ok2 = FileAttachment("./tex-expression.md").text()
```

