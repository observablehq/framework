import {readFile, writeFile} from "node:fs/promises";
import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {WebSocket} from "ws";
import type {ParseResult} from "../../src/markdown.js";
import {parseMarkdown} from "../../src/markdown.js";
import {preview as previewServer} from "../../src/preview.js";
import type {PreviewOptions, PreviewServer} from "../../src/preview.js";

const testRoot = "test/preview/dashboard";
const testHostName = process.env.TEST_HOSTNAME ?? "127.0.0.1";
const testPort = +(process.env.TEST_PORT ?? 8080);

const testServerOptions: PreviewOptions = {
  root: testRoot,
  hostname: testHostName,
  port: testPort,
  verbose: false
};

chai.use(chaiHttp);

const testServerUrl = `http://${testHostName}:${testPort}`;

describe("preview server", () => {
  let testServer: PreviewServer["_server"];

  before(async () => {
    testServer = (await previewServer(testServerOptions)).server;
  });

  after(async () => {
    if (testServer) await testServer.close();
  });

  describe("http", () => {
    it("should start a server", async () => {
      const res = await chai.request(testServerUrl).get("/");
      expect(res).to.have.status(200);
      assert.ok(res.text);
    });

    it("redirects /index to /", async () => {
      const res = await chai.request(testServerUrl).get("/index").redirects(0);
      expect(res).to.redirectTo(/^\/$/);
      expect(res).to.have.status(302);
    });

    it("serves nested pages", async () => {
      const res = await chai.request(testServerUrl).get("/code/code");
      expect(res).to.have.status(200);
      expect(res.text).to.have.string("This text is not visible by default.");
    });

    it.skip("serves preserves query params", async () => {});

    it("serves Observable runtime.js", async () => {
      const res = await chai.request(testServerUrl).get("/_observablehq/runtime.js");
      expect(res).to.have.status(200);
      expect(res.body.toString()).to.have.string("@observablehq/runtime v5.9.5 Copyright 2023 Observable, Inc.");
    });

    it("serves Observable client.js", async () => {
      const res = await chai.request(testServerUrl).get("/_observablehq/client.js");
      expect(res).to.have.status(200);
      expect(res.text).to.have.string("makeDatabaseClient");
    });

    it("serves dependencies from the public directory", async () => {
      const res = await chai.request(testServerUrl).get("/_observablehq/style.css");
      expect(res).to.have.status(200);
      expect(res.text).to.have.string("font-family");
    });

    it("serves local imports", async () => {
      const res = await chai.request(testServerUrl).get("/_import/format.js");
      expect(res).to.have.status(200);
      expect(res.text).to.have.string("function formatTitle(title)");
    });

    it("handles missing imports", async () => {
      const res = await chai.request(testServerUrl).get("/_import/idontexist.js");
      expect(res).to.have.status(404);
      expect(res.text).to.have.string("404 page");
    });

    it("serves local files", async () => {
      const res = await chai.request(testServerUrl).get("/_file/file.csv");
      expect(res).to.have.status(200);
      assert.ok(res.text);
    });

    it("handles missing files", async () => {
      const res = await chai.request(testServerUrl).get("/_file/idontexist.csv");
      expect(res).to.have.status(404);
      expect(res.text).to.have.string("404 page");
    });
  });

  describe("websocket", () => {
    let testWebSocket: WebSocket;
    let fileContent: string;
    let pageContent: string;
    let parsedContent: ParseResult;
    let messages: string[] = [];

    before(async () => {
      pageContent = await readFile(`${testRoot}/index.md`, "utf-8");
      fileContent = await readFile(`${testRoot}/file.csv`, "utf-8");
      parsedContent = await parseMarkdown(pageContent, "test/preview/dashboard", "index.md");
      testWebSocket = new WebSocket(Object.assign(new URL("/_observablehq", testServerUrl), {protocol: "ws"}));

      testWebSocket.onopen = () => {
        testWebSocket.send(JSON.stringify({type: "hello", path: "/", hash: parsedContent.hash}));
      };

      testWebSocket.on("message", function message(data) {
        messages.push(JSON.parse(data.toString()));
      });

      testWebSocket.onerror = (error) => {
        console.error("error", error);
      };

      testWebSocket.onclose = () => {
        console.info("socket close");
      };
    });

    after(async () => {
      // reset file contents
      await writeFile(`${testRoot}/index.md`, pageContent);
      await writeFile(`${testRoot}/file.csv`, fileContent);
      if (testWebSocket) testWebSocket.close();
    });

    it("watch .md file", (done) => {
      messages = [];
      setTimeout(() => {
        writeFile(`${testRoot}/index.md`, pageContent + "\n\n<div>Hello</div>");
      }, 1000);

      setTimeout(() => {
        // .md file is watched
        expect(messages).to.have.length(1);
        expect(messages[0]["type"]).to.equal("update");
        done();
      }, 1500);
    });

    it("file attachment is watched", (done) => {
      messages = [];
      setTimeout(() => {
        writeFile(`${testRoot}/file.csv`, fileContent + "\n1880-02-01,-0.21");
      }, 1000);

      setTimeout(() => {
        // file attachment is watched
        expect(messages).to.have.length(1);
        expect(messages[0]["type"]).to.equal("refresh");
        done();
      }, 1500);
    });
  });
});
