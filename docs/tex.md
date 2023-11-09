# TeX

${tex`\TeX`} is a language for typesetting mathematical formulae. Observable Markdown’s implementation is powered by ${tex`\KaTeX`}.

There are two ways to use TeX. The first is a `tex` fenced code block:

```tex show
E = mc^2
```

The second is an inline expression using the `tex` tagged template literal provided by the Observable standard library:

````md
My favorite equation is ${tex`E = mc^2`}.
````

This produces:

My favorite equation is ${tex`E = mc^2`}.
