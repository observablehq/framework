# JavaScript: Files

You can load files using the built-in `FileAttachment` function.

```js show
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

${Inputs.table(gistemp)}

The following type-specific methods are supported: *csv*, *html*, *image*, *json*, *sqlite*, *text*, *tsv*, *xlsx*, *xml*, and *zip*. There are also generic methods: *arrayBuffer*, *blob*, and *url*. Each method returns a promise to the file’s contents (or URL).

We use static analysis to determine which files are used so that we can include only referenced files when building. The `FileAttachment` function accepts only literal strings; code such as `FileAttachment("my" + "file.csv")` or similar dynamic invocation is invalid syntax.
