# ZIP

The `file.zip()` method returns a promise to a `ZipArchive` object, with a .filenames property listing the paths of the files contained within the .zip [archive](<https://en.wikipedia.org/wiki/ZIP_(file_format)>):

```js echo
const muybridge = FileAttachment("muybridge.zip").zip();
```

```js echo
muybridge
```

To pull out a single file from the archive, use the _`archive`_`.file()` method. It returns a new FileAttachment, which you can then use just like any other file:

```js echo
muybridge.file("deer.jpeg").image({width: 640, alt: "A deer"})
```

Or inline:

<div style="display: flex; max-width: 640px; flex-wrap: wrap;">
${muybridge.file("horse.jpeg").image({width: 210})}
${muybridge.file("deer.jpeg").image({width: 210})}
${muybridge.file("ox.jpeg").image({width: 210})}
</div>

```md
<div style="display: flex; max-width: 640px; flex-wrap: wrap;">
  ${muybridge.file("horse.jpeg").image({width: 210})}
  ${muybridge.file("deer.jpeg").image({width: 210})}
  ${muybridge.file("ox.jpeg").image({width: 210})}
</div>
```

To extract resources from a zip archive, we use [JSZip](https://stuk.github.io/jszip/). Note that if you want to pull out a file from an archive at build time, you might prefer to do so with a [data loader](../loaders#archives) instead. There is a trade-off: in the former case, the reader’s browser will download both the zip archive and the JSZip library, and let you walk through the list of files in a possibly interactive way; in the latter case, it will only download the extracted file, but its contents have to be known [statically](#static-analysis) at build time.

If you want to create a download link for the archive itself, use `file.url()`:

```js echo
FileAttachment("../data/muybridge.zip").url()
  .then((href) => html`<a ${{href}} download><button>download zip`)
```
