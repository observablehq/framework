import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import deepEqual from "fast-deep-equal";
import {isEnoent} from "../src/error.js";
import {type ParseResult, parseMarkdown} from "../src/markdown.js";
import {normalizePieceHtml} from "../src/markdown.js";

const html = (strings, ...values) => String.raw({raw: strings}, ...values);
const mockContext = () => ({files: [], imports: [], pieces: [], startLine: 0, currentLine: 0});

describe("parseMarkdown(input)", () => {
  const inputRoot = "test/input";
  const outputRoot = "test/output";
  for (const name of readdirSync(inputRoot)) {
    if (!name.endsWith(".md")) continue;
    const path = join(inputRoot, name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;

    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const snapshot = await parseMarkdown(await readFile(path, "utf8"), "test/input", name);
      let allequal = true;
      for (const ext of ["html", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot[ext];
        const outfile = resolve(outputRoot, `${basename(outname, ".md")}.${ext}`);
        const diffile = resolve(outputRoot, `${basename(outname, ".md")}-changed.${ext}`);
        let expected;

        try {
          expected = await readFile(outfile, "utf8");
        } catch (error) {
          if (!isEnoent(error) || process.env.CI === "true") throw error;
          console.warn(`! generating ${outfile}`);
          await mkdir(outputRoot, {recursive: true});
          await writeFile(outfile, actual, "utf8");
          continue;
        }

        const equal = ext === "json" ? jsonEqual(expected, actual) : expected === actual;

        if (equal) {
          if (process.env.CI !== "true") {
            try {
              await unlink(diffile);
              console.warn(`! deleted ${diffile}`);
            } catch (error) {
              if (!isEnoent(error)) throw error;
            }
          }
        } else {
          allequal = false;
          console.warn(`! generating ${diffile}`);
          await writeFile(diffile, actual, "utf8");
        }
      }
      assert.ok(allequal, `${name} must match snapshot`);
    });
  }
});

describe("normalizePieceHtml adds local file attachments", () => {
  const sourcePath = "/attachments.md";

  it("img[src]", () => {
    const htmlStr = html`<img src="./test.png">`;
    const expected = html`<img src="./_file/test.png">`;
    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "image/png",
        name: "./test.png",
        path: "./_file/test.png"
      }
    ]);
  });

  it("img[srcset]", () => {
    const htmlStr = html`
        <img
          srcset="small.jpg 480w, large.jpg 800w"
          sizes="(max-width: 600px) 480px,
                800px"
          src="large.jpg"
          alt="Image for testing"
        />
      `;
    const expected = html`
        <img srcset="./_file/small.jpg 480w, ./_file/large.jpg 800w" sizes="(max-width: 600px) 480px,
                800px" src="./_file/large.jpg" alt="Image for testing">
      `;
    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "image/jpeg",
        name: "./large.jpg",
        path: "./_file/large.jpg"
      },
      {
        mimeType: "image/jpeg",
        name: "./small.jpg",
        path: "./_file/small.jpg"
      }
    ]);
  });

  it("video[src]", () => {
    const htmlStr = html`<video src="observable.mov" controls>
      Your browser doesn't support HTML video.
      </video>`;
    const expected = html`<video src="./_file/observable.mov" controls>
      Your browser doesn't support HTML video.
      </video>`;
    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "video/quicktime",
        name: "./observable.mov",
        path: "./_file/observable.mov"
      }
    ]);
  });

  it("video source[src]", () => {
    const htmlStr = html`<video width="320" height="240" controls>
      <source src="observable.mp4" type="video/mp4">
      <source src="observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

    const expected = html`<video width="320" height="240" controls>
      <source src="./_file/observable.mp4" type="video/mp4">
      <source src="./_file/observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "video/mp4",
        name: "./observable.mp4",
        path: "./_file/observable.mp4"
      },
      {
        mimeType: "video/quicktime",
        name: "./observable.mov",
        path: "./_file/observable.mov"
      }
    ]);
  });

  it("picture source[srcset]", () => {
    const htmlStr = html`<picture>
      <source srcset="observable-logo-wide.png" media="(min-width: 600px)"/>
      <img src="observable-logo-narrow.png" />
    </picture>`;

    const expected = html`<picture>
      <source srcset="./_file/observable-logo-wide.png" media="(min-width: 600px)">
      <img src="./_file/observable-logo-narrow.png">
    </picture>`;

    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "image/png",
        name: "./observable-logo-narrow.png",
        path: "./_file/observable-logo-narrow.png"
      },
      {
        mimeType: "image/png",
        name: "./observable-logo-wide.png",
        path: "./_file/observable-logo-wide.png"
      }
    ]);
  });
});

describe("normalizePieceHtml only adds local files", () => {
  const sourcePath = "/attachments.md";

  it("img[src] only adds local files", () => {
    const htmlStr = html`<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Shorthair.jpg/900px-American_Shorthair.jpg">`;
    const expected = html`<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Shorthair.jpg/900px-American_Shorthair.jpg">`;
    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, []);
  });

  it("img[srcset] only adds local files", () => {
    const htmlStr = html`
        <img
          srcset="small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w"
          sizes="(max-width: 600px) 480px, 900px"
          src="https://upload.wikimedia.org/900px-American_Shorthair.jpg"
          alt="Cat image for testing"
        />
      `;
    const expected = html`
        <img srcset="./_file/small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">
      `;
    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "image/jpeg",
        name: "./small.jpg",
        path: "./_file/small.jpg"
      }
    ]);
  });

  it("video source[src] only adds local files", () => {
    const htmlStr = html`<video width="320" height="240" controls>
      <source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube"/>
      <source src="observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

    const expected = html`<video width="320" height="240" controls>
      <source src="https://www.youtube.com/watch?v=SsFyayu5csc" type="video/youtube">
      <source src="./_file/observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

    const context = mockContext();
    const actual = normalizePieceHtml(htmlStr, sourcePath, context);

    assert.equal(actual, expected);
    assert.deepEqual(context.files, [
      {
        mimeType: "video/quicktime",
        name: "./observable.mov",
        path: "./_file/observable.mov"
      }
    ]);
  });
});

function jsonMeta({html, ...rest}: ParseResult): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
