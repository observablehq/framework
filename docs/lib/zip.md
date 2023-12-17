# ZIP

To load a [ZIP archive](<https://en.wikipedia.org/wiki/ZIP_(file_format)>), use a [`FileAttachment`](../javascript/files).

```js echo
const muybridge = FileAttachment("muybridge.zip").zip();
```

This returns a promise to a `ZipArchive`. This uses [JSZip](https://stuk.github.io/jszip/) under the hood.

```js echo
muybridge
```

The `filenames` property lists the paths of the files contained within the ZIP archive.

```js echo
muybridge.filenames
```

To pull out a single file from the archive, use the `archive.file` method. It returns a `FileAttachment` which you can use to load the file contents like any other file.

```js echo
muybridge.file("deer.jpeg").image({width: 320, alt: "A deer"})
```

That said, if you know the name of the file within the ZIP archive statically, you don’t need to load the ZIP archive; you can simply request the [file within the archive](../routing#archives) directly. The specified file is then extracted from the ZIP archive at build time.

```js echo
FileAttachment("muybridge/deer.jpeg").image({width: 320, alt: "A deer"})
```

For images and other media, you can simply use static HTML.

<img src="muybridge/deer.jpeg" width="320" alt="A deer">

```html
<img src="muybridge/deer.jpeg" width="320" alt="A deer">
```

So, one reason to load a ZIP archive is that you don’t know the files statically — for example, if you have an arbitrary collection of images, and you want to display them all.

${html`<div style="display: grid; grid-auto-rows: 1fr; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-gap: 1rem;">${await Promise.all(muybridge.filenames.map((f) => muybridge.file(f).image({style: "width: 100%;"})))}</div>`}

```html
<div style="display: grid; grid-auto-rows: 1fr; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-gap: 1rem;">
  ${Promise.all(muybridge.filenames.map((f) => muybridge.file(f).image()))}
</div>
```


Note that if you want to pull out a file from an archive at build time, you might prefer to do so with a [data loader](../loaders#archives) instead.

There is a trade-off: in the former case, the reader’s browser will download both the zip archive and the JSZip library, and let you walk through the list of files in a possibly interactive way; in the latter case, it will only download the extracted file, but its contents have to be known [statically](#static-analysis) at build time.

If you want to create a download link for the archive itself, use `file.url()`:

```js echo
FileAttachment("../data/muybridge.zip").url()
  .then((href) => html`<a ${{href}} download><button>download zip`)
```

But probably better to do this?

<a href="muybridge.zip" download>
  <button>download zip</button>
</a>

```html
<a href="muybridge.zip" download>
  <button>download zip</button>
</a>
```
