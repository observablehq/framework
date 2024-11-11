[Framework examples →](../)

# Julia data loader to generate TXT

View live: <https://observablehq.observablehq.cloud/framework-example-loader-julia-to-txt/>

This Observable Framework example demonstrates how to write a data loader in Julia that generates a text file. Text of Edgar Allen Poe’s _The Raven_ is accessed from [Project Gutenberg](https://www.gutenberg.org/cache/epub/1065/pg1065.txt). The text is parsed and its 29th stanza (paragraph) is returned as text to standard out.

The data loader lives in [`src/data/raven.txt.jl`](./src/data/raven.txt.jl).
