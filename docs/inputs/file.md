# File input

<!-- [TODO] check okay, updated to point to /javascript/files rather than FileAttachment info in docs -->

The File input specifies a local file. The exposed value provides the same interface as an Observable [file attachment](../javascript/files) for convenient parsing in various formats such as text, image, JSON, CSV, ZIP, and XLSX; however, the file is not uploaded and is only available temporarily in memory.

By default, any file is allowed, and the value of the input resolves to null.

<!-- [TODO] check error, return to File input after hearing back (Fil has PR submitted) -->

```js echo
const file = view(Inputs.file())
```