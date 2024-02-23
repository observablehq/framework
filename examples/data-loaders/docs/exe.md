# Executable data loader examples

Observable Framework supports arbitrary executable (.exe) data loaders, which _can_ be any arbitrary executable (_e.g._ compiled from C) but often specify another interpreter using a shebang as shown in the examples below. Unlike interpreted data loaders (_e.g._ Python, R), executable data loaders require that you make the loader executable, typically done via `chmod`. For example:

```sh
chmod +x docs/quakes.csv.exe
```

## JPEG

The data loader below specifies the R interpreter, `Rscript`, to execute the file (`#!/usr/bin/env Rscript`). A scatterplot chart built with [`ggplot2`](https://ggplot2.tidyverse.org/) using the built-in diamonds dataset is returned as a JPEG to standard output.

Create a file in your project source root with the .jpeg.exe double extension (for example, `docs/data/my-chart.jpeg.exe`). Remember to make the script executable, for example using:

```sh
chmod +x docs/data/my-chart.jpeg.exe
```

Then, paste the code below to get started.

```js
showCode(FileAttachment("data/diamonds.jpeg.exe"), {language: "R"})
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const diamonds = FileAttachment("data/diamonds.jpeg").image({width: 500});
```

<p class="tip">The file attachment name does not include the <tt>.exe</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now view the image:

```js echo
diamonds
```

## TXT

The data loader below specifies the Julia language interpreter using the shebang (`#!/usr/bin/env julia`). Text of Edgar Allen Poe's _The Raven_ is accessed from [Project Gutenberg](https://www.gutenberg.org/cache/epub/1065/pg1065.txt). The text is parsed and single paragraph (specified by number) is returned as text.

Create a file in your project source root with the .txt.exe double extension (for example, `docs/data/my-chart.txt.exe`). Remember to make the script executable, for example using:

```sh
chmod +x docs/data/my-chart.txt.exe
```

Then, paste the code below to get started.

```js
showCode(FileAttachment("data/raven.txt.exe"), {language: "Julia"})
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const ravenParagraph = FileAttachment("data/raven.txt").text();
```

<p class="tip">The file attachment name does not include the <tt>.exe</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now view the paragraph text:

```js echo
ravenParagraph
```

```js
import {showCode} from "./components/showCode.js";
```
