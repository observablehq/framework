# Parent dir

Trying to fetch from the parent directory should fail.

```js
const fail1 = FileAttachment("../NOENT.md").text()
```

```js
const fail2 = FileAttachment("../README.md").text()
```

```js
const fail3 = FileAttachment("./NOENT.md").text()
```

```js
const ok1 = FileAttachment("./tex-expression.md").text()
```
