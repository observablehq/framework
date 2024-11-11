# markdown-it-footnote

This Framework example demonstrates how to use [`markdown-it-footnote`](https://github.com/markdown-it/markdown-it-footnote) to create footnotes in Markdown.

First, install `markdown-it-footnote` with your preferred package manager such as npm or Yarn. Then, register the plugin using the **markdownIt** config option in your `observablehq.config.js` file.

```js run=false
import MarkdownItFootnote from "markdown-it-footnote";

export default {
  root: "src",
  markdownIt: (md) => md.use(MarkdownItFootnote)
};
```

Below is an example of referencing a footnote.

Here is a footnote reference,[^1] and another.[^longnote]

```md run=false
Here is a footnote reference,[^1] and another.[^longnote]
```

And here is how you can define the footnotes.

[^1]: Here is the footnote.
[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
    belong to the previous footnote.

```md run=false
[^1]: Here is the footnote.
[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
    belong to the previous footnote.
```

Footnotes always appear at the bottom of the page, regardless of where they are defined. The remaining text is gibberish so that the page is taller, allowing you to try clicking on the footnote references to scroll down and then clicking on ther return link to scroll back up again.

Aliquam porta accumsan eros, ut posuere lorem congue at. Cras lobortis metus sit amet ex ullamcorper lobortis. Donec vitae nulla dictum, cursus nunc auctor, facilisis tellus. Morbi iaculis ex sed nisi tristique, a auctor elit suscipit. Vestibulum varius, massa in laoreet facilisis, quam arcu dictum metus, sit amet ultricies erat metus non elit. Quisque fringilla gravida sapien non facilisis. Aliquam a ligula vitae tellus rutrum tincidunt. Integer mattis suscipit ex vel egestas. Aenean pharetra sit amet tellus ac tempus.

Cras dapibus porta posuere. Aenean tempus nulla eget sem auctor, eget interdum urna sodales. Mauris ullamcorper nec ipsum in tempor. Pellentesque eleifend rutrum nunc eu aliquam. Aliquam quis tellus ligula. Mauris mattis quis nibh vel tincidunt. Aliquam aliquam scelerisque nisl, ac aliquam arcu accumsan et. Nunc tempor condimentum quam a ullamcorper. Aliquam imperdiet ac neque in maximus. Proin urna urna, feugiat sed placerat vitae, fringilla ac diam. Morbi ac ipsum nunc.

Morbi placerat sodales ex, a eleifend quam interdum a. Nullam tellus sem, convallis a finibus a, placerat sed ante. Nullam sit amet dictum mauris. In sed mattis risus, et pulvinar eros. Pellentesque commodo urna ipsum, vitae euismod erat mollis a. Sed ornare, turpis in maximus dapibus, urna nibh dictum leo, suscipit mattis diam tellus ac ante. Vestibulum placerat, justo sit amet ultricies ultricies, orci massa aliquam purus, id ullamcorper odio urna nec leo.
