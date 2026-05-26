# Source code

This project relies on a **data loader** that reads all the source files and outputs a single summary file, minimized to contain only a subset of the source information:

```js
import hljs from "npm:highlight.js";
```

`data/presse.parquet.sh`

```js
const pre = display(document.createElement("pre"));
FileAttachment("data/presse.parquet.sh")
  .text()
  .then(
    (text) => (pre.innerHTML = hljs.highlight(text, { language: "bash" }).value)
  );
```

This is the file that the other pages reference in the front matter:

```yaml
---
sql:
  presse: data/presse.parquet
---
```

and process with [sql](https://observablehq.com/framework/sql) code blocks:

````sql run=false
```sql
SELECT COUNT() FROM presse
```
````
