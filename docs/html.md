# HTML

You can write HTML directly into Observable Markdown. HTML is useful for greater control over layout, say to use CSS grid for a responsive bento box layout in a dashboard, or adding an external stylesheet via a link element. For example, here is an HTML details element:

````html
<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>
````

This produces:

<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>

In Markdown, blank lines denote separate HTML blocks; be sure to avoid blank lines if you want to treat a chunk of HTML as a single block. For example, write this:

```md
<!-- 👍 one HTML block -->
<ul>
  <li>one</li>
  <li>two</li>
  <li>three</li>
</ul>
```

Don’t write this:

```md
<!-- 👎 three HTML blocks -->
<ul>

  <li>one</li>
  <li>two</li>
  <li>three</li>

</ul>
```

In the latter case, the li elements become top-level and wrapped in a span, rather than children of the ul.
