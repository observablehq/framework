import assert from "node:assert";
import {normalizePieceHtml} from "../src/markdown.js";

const html = (strings, ...values) => String.raw({raw: strings}, ...values);
const mockContext = () => ({files: [], imports: [], pieces: [], startLine: 0, currentLine: 0});

describe("file attachments", () => {
  describe("added", () => {
    const sourcePath = "/attachments.md";

    it("img[src]", () => {
      const htmlStr = html`<img src="./test.png"><img src="test.png">`;
      const expected = html`<span><img src="./test.png"><img src="./test.png"></span>`;
      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "image/png",
          name: "./test.png",
          path: "./test.png"
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
        <img srcset="./small.jpg 480w, ./large.jpg 800w" sizes="(max-width: 600px) 480px,
                800px" src="./large.jpg" alt="Image for testing">
      `;
      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "image/jpeg",
          name: "large.jpg",
          path: "./large.jpg"
        },
        {
          mimeType: "image/jpeg",
          name: "small.jpg",
          path: "./small.jpg"
        }
      ]);
    });

    it("video[src]", () => {
      const htmlStr = html`<video src="observable.mov" controls>
      Your browser doesn't support HTML video.
      </video>`;
      const expected = html`<video src="./observable.mov" controls>
      Your browser doesn't support HTML video.
      </video>`;
      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "video/quicktime",
          name: "observable.mov",
          path: "./observable.mov"
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
      <source src="./observable.mp4" type="video/mp4">
      <source src="./observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "video/mp4",
          name: "observable.mp4",
          path: "./observable.mp4"
        },
        {
          mimeType: "video/quicktime",
          name: "observable.mov",
          path: "./observable.mov"
        }
      ]);
    });

    it("picture source[srcset]", () => {
      const htmlStr = html`<picture>
      <source srcset="observable-logo-wide.png" media="(min-width: 600px)"/>
      <img src="observable-logo-narrow.png" />
    </picture>`;

      const expected = html`<picture>
      <source srcset="./observable-logo-wide.png" media="(min-width: 600px)">
      <img src="./observable-logo-narrow.png">
    </picture>`;

      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "image/png",
          name: "observable-logo-narrow.png",
          path: "./observable-logo-narrow.png"
        },
        {
          mimeType: "image/png",
          name: "observable-logo-wide.png",
          path: "./observable-logo-wide.png"
        }
      ]);
    });
  });

  describe("not added", () => {
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
        <img srcset="./small.jpg 480w, https://upload.wikimedia.org/900px-American_Shorthair.jpg 900w" sizes="(max-width: 600px) 480px, 900px" src="https://upload.wikimedia.org/900px-American_Shorthair.jpg" alt="Cat image for testing">
      `;
      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "image/jpeg",
          name: "small.jpg",
          path: "./small.jpg"
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
      <source src="./observable.mov" type="video/mov">
      Your browser doesn't support HTML video.
      </video>`;

      const context = mockContext();
      const actual = normalizePieceHtml(htmlStr, sourcePath, context);

      assert.equal(actual, expected);
      assert.deepEqual(context.files, [
        {
          mimeType: "video/quicktime",
          name: "observable.mov",
          path: "./observable.mov"
        }
      ]);
    });
  });
});
