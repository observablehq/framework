import {readFile, writeFile} from "node:fs/promises";
import {setTimeout} from "timers/promises";
import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {WebSocket} from "ws";
import {normalizeConfig} from "../../src/config.js";
import type {ParseResult} from "../../src/markdown.js";
import {parseMarkdown} from "../../src/markdown.js";
import {preview} from "../../src/preview.js";
import type {PreviewOptions, PreviewServer} from "../../src/preview.js";

const testHostRoot = "test/preview/dashboard";
const testHostName = process.env.TEST_HOSTNAME ?? "127.0.0.1";
const testPort = +(process.env.TEST_PORT ?? 8080);

const testServerOptions: PreviewOptions = {
  config: await normalizeConfig({root: testHostRoot}),
  hostname: testHostName,
  port: testPort,
  verbose: false
};

chai.use(chaiHttp);

const testServerUrl = `http://${testHostName}:${testPort}`;

describe("preview server", () => {
  let testServer: PreviewServer["_server"];

  before(async () => {
    testServer = (await preview(testServerOptions)).server;
  });

  after(() => {
    testServer?.close();
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

    it("serves Observable runtime.js", async () => {
      const res = await chai.request(testServerUrl).get("/_observablehq/runtime.js");
      expect(res).to.have.status(200);
      expect(res.body.toString()).to.have.string("@observablehq/runtime v5.9.5 Copyright 2023 Observable, Inc.");
    });

    it("serves Observable stdlib.js", async () => {
      const res = await chai.request(testServerUrl).get("/_observablehq/stdlib.js");
      expect(res).to.have.status(200);
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
      pageContent = await readFile(`${testHostRoot}/index.md`, "utf-8");
      fileContent = await readFile(`${testHostRoot}/file.csv`, "utf-8");
      parsedContent = await parseMarkdown(pageContent, "test/preview/dashboard", "index.md");
      testWebSocket = new WebSocket(Object.assign(new URL("/_observablehq", testServerUrl), {protocol: "ws"}));

      testWebSocket.onopen = () => {
        testWebSocket.send(JSON.stringify({type: "hello", path: "/", hash: parsedContent.hash}));
      };

      testWebSocket.on("message", function message(data) {
        messages.push(JSON.parse(data.toString()));
      });

      testWebSocket.onerror = (error) => {
        console.error("websocket error", error);
      };

      testWebSocket.onclose = () => {
        console.info("websocket close");
      };
    });

    after(async () => {
      testWebSocket?.close();
      testServer?.close();
      // reset file contents
      await writeFile(`${testHostRoot}/index.md`, pageContent);
      await writeFile(`${testHostRoot}/file.csv`, fileContent);
    });

    it("watch .md file", async () => {
      messages = [];
      await setTimeout(500); // avoid sending a "reload" message
      await writeFile(`${testHostRoot}/index.md`, pageContent + "\n\n<div>Hello</div>");
      await setTimeout(1000);
      expect(messages).to.have.length(1);
      expect(messages[0]["type"]).to.equal("update");
    });

    it("watch file attachment", async () => {
      messages = [];
      writeFile(`${testHostRoot}/file.csv`, fileContent + "\n1880-02-01,-0.21");
      await setTimeout(1000);
      expect(messages).to.have.length(1);
      expect(messages[0]["type"]).to.equal("refresh");
    });
  });
});
