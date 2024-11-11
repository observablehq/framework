# Selecting files

This example demonstrates how to select a file from a drop-down menu using [`Inputs.select`](https://observablehq.com/framework/inputs/select). `FileAttachment` requires a [static string literal argument](https://observablehq.com/framework/files#static-analysis), so the value of the select is a `FileAttachment` rather than a string.

```js echo
const file = view(Inputs.select([
  FileAttachment("data/buy-a-boat-cat.jpg"),
  FileAttachment("data/is-this-a-pigeon.jpg"),
  FileAttachment("data/picard-annoyed.jpg"),
  FileAttachment("data/picard-facepalm.jpg")
], {
  format: (d) => d.name
}));
```

```js echo
file
```

To load the file, call the desired contents method. For example, for an image:

```js echo
file.image({width: 640}) // load the image
```
