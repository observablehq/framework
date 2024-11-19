import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {preview} from "../../src/preview.js";
import type {PreviewOptions, PreviewServer} from "../../src/preview.js";
import {mockJsDelivr} from "../mocks/jsdelivr.js";

const testHostRoot = "test/preview/dashboard";
const testHostName = "127.0.0.1";
const testPort = 3210; // avoid conflict with preview server
const testServerUrl = `http://${testHostName}:${testPort}`;

chai.use(chaiHttp);

describe("preview server", () => {
  let testServer: PreviewServer["_server"];

  mockJsDelivr();

  before(async () => {
    const testServerOptions: PreviewOptions = {
      root: testHostRoot,
      hostname: testHostName,
      port: testPort,
      verbose: false
    };
    testServer = (await preview(testServerOptions)).server;
  });

  after(async () => {
    if (testServer) testServer.close();
  });

  it("should start a server", async () => {
    const res = await chai.request(testServerUrl).get("/");
    expect(res).to.have.status(200);
    assert.ok(res.text);
  });

  it.skip("redirects /index to /", async () => {
    const res = await chai.request(testServerUrl).get("/index").redirects(0);
    expect(res).to.redirectTo(/^\/$/);
    expect(res).to.have.status(302);
  });

  it("serves nested pages", async () => {
    const res = await chai.request(testServerUrl).get("/code/code");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("This text is not visible by default.");
  });

  it("serves scripts from _observablehq/", async () => {
    const res = await chai.request(testServerUrl).get("/_observablehq/stdlib.js");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("function FileAttachment");
  });

  it("serves local imports", async () => {
    const res = await chai.request(testServerUrl).get("/_import/format.js");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("function formatTitle(title)");
  });

  it("handles missing imports", async () => {
    const res = await chai.request(testServerUrl).get("/_import/idontexist.js");
    expect(res).to.have.status(404);
    expect(res.text).to.have.string("File not found");
  });

  it("serves local files", async () => {
    const res = await chai.request(testServerUrl).get("/_file/file.csv");
    expect(res).to.have.status(200);
    assert.ok(res.text);
  });

  it("serves files built with a data loader", async () => {
    const res = await chai.request(testServerUrl).get("/_file/asset.txt");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("Built by");
  });

  it("handles missing files", async () => {
    const res = await chai.request(testServerUrl).get("/_file/idontexist.csv");
    expect(res).to.have.status(404);
    expect(res.text).to.have.string("File not found");
  });

  it("serves exported files", async () => {
    const res = await chai.request(testServerUrl).get("/robots.txt");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("User-agent:");
  });

  it("serves exported files built with a data loader", async () => {
    const res = await chai.request(testServerUrl).get("/asset.txt");
    expect(res).to.have.status(200);
    expect(res.text).to.have.string("Built by");
  });
});
