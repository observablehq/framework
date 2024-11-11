---
keywords: katex
---

# TeX

${tex`\TeX`} is a language for typesetting mathematical formulae. Observable provides a TeX tagged template literal implementation powered by ${tex`\KaTeX`}. It is available by default as `tex` in Markdown, but you can also import it like so:

```js echo
import tex from "npm:@observablehq/tex";
```

There are two ways to use TeX. The first is a `tex` fenced code block:

````md
```tex
E = mc^2
```
````

This produces a centered block:

```tex
E = mc^2
```

The second is an inline expression using the `tex` tagged template literal provided by the Observable standard library:

```md
My favorite equation is ${tex`E = mc^2`}.
```

This produces:

My favorite equation is ${tex`E = mc^2`}.

Here are some more examples.

```tex echo
c = \pm\sqrt{a^2 + b^2}
```

```tex echo
\Delta E^*_{00} = \sqrt{
  \Big(\frac{\Delta L'}{k_LS_L}\Big)^2 +
  \Big(\frac{\Delta C'}{k_CS_C}\Big)^2 +
  \Big(\frac{\Delta H'}{k_HS_H}\Big)^2 +
  R_T
  \frac{\Delta C'}{k_CS_C}
  \frac{\Delta H'}{k_HS_H}}
```

```tex echo
\def\f#1#2{#1f(#2)}
\f\relax{x} = \int_{-\infty}^\infty
    \f\hat\xi\,e^{2 \pi i \xi x}
    \,d\xi
```

For more, see [the documentation website](https://katex.org/), in particular the [list of supported functions](https://katex.org/docs/supported).
