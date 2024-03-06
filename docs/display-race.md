# Display race

```js echo
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

```js echo
const value = (function* () {
  yield 2000;
  yield 1000;
})();
```

```js echo
await sleep(value);
display(value);
```
