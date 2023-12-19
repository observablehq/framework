import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {setTimeout} from "timers/promises";
import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {WebSocket} from "ws";
import {normalizeConfig} from "../../src/config.js";
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

describe("preview server", function () {
  let testServer: PreviewServer["_server"];

  before(async () => {
    testServer = (await preview(testServerOptions)).server;
  });

  after(() => {
    testServer?.close();
  });

  this.timeout(30_000);

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

    it("serves a dataloader", async () => {
      const res = await chai.request(testServerUrl).get("/_file/file.json");
      expect(res).to.have.status(200);
      expect(res.text).to.have.string('{"a":1,"b":2}');
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

  describe("websocket", function () {
    let testWebSocket: WebSocket;
    let messages: string[] = [];

    before(async () => {
      const pageContent = await readFile(`${testHostRoot}/index.md`, "utf-8");
      const parsedContent = await parseMarkdown(pageContent, "test/preview/dashboard", "index.md");
      testWebSocket = new WebSocket(Object.assign(new URL("/_observablehq", testServerUrl), {protocol: "ws"}));

      testWebSocket.onopen = () => {
        testWebSocket.send(JSON.stringify({type: "hello", path: "/", hash: parsedContent.hash}));
      };

      testWebSocket.on("message", function message(data) {
        messages = [];
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
      messages = [];
      testWebSocket?.close();
      testServer?.close();
    });

    function updateFile(path: string, content: string) {
      let output = content;
      if (existsSync(path)) {
        const existingContent = readFileSync(path, "utf-8");
        output = existingContent + "\n" + content;
      }
      writeFileSync(path, output);
    }

    function resetFile(path: string, originalContent: string): void {
      try {
        testWebSocket?.pause();
        writeFileSync(path, originalContent);
      } catch {
        // ignore
      }
      testWebSocket?.resume();
    }

    it("watches .md file", async () => {
      const path = `${testHostRoot}/index.md`;
      const pageContent = readFileSync(path, "utf-8");
      try {
        await setTimeout(100); // add delay to avoid "reload" message
        updateFile(path, "<div>Hello</div>");
        await setTimeout(500); // wait for "update" message
        expect(messages).to.have.length(1);
        expect(messages[0]["type"]).to.equal("update");
      } finally {
        resetFile(path, pageContent);
      }
    });

    it("watches file attachments", async () => {
      const path = `${testHostRoot}/file.csv`;
      const fileContent = readFileSync(path, "utf-8");
      try {
        await setTimeout(150); // fileWatchers delay + 50 ms
        updateFile(path, "1880-02-01,-0.21");
        await setTimeout(500); // wait for "refresh" message
        expect(messages).to.have.length(1);
        expect(messages[0]["type"]).to.equal("refresh");
      } finally {
        resetFile(path, fileContent);
      }
    });

    it("watches import changes", async () => {
      const path = `${testHostRoot}/format.js`;
      const fileContent = readFileSync(path, "utf-8");
      try {
        await setTimeout(100); // add delay to avoid "reload" message
        updateFile(path, "//random comment");
        await setTimeout(500); // wait for "update" message
        expect(messages).to.have.length(1);
        expect(messages[0]["type"]).to.equal("update");
      } finally {
        resetFile(path, fileContent);
      }
    });
  });
});
