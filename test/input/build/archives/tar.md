# Tar

```js
await FileAttachment("static-tar/file.txt").text()
```

```js
await FileAttachment("static-tgz/file.txt").text()
```

```js
await FileAttachment("static-tar/does-not-exist.txt").text()
```

```js
await FileAttachment("dynamic-tar/file.txt").text()
```

```js
await FileAttachment("dynamic-tar/does-not-exist.txt").text()
```

```js
await FileAttachment("dynamic-tar-gz/file.txt").text()
```

```js
await FileAttachment("dynamic-tar-gz/does-not-exist.txt").text()
```
