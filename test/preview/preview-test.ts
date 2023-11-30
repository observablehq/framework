import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {preview} from "../../src/preview.js";
import type {PreviewOptions, PreviewServer} from "../../src/preview.js";

const testHostRoot = "test/preview/dashboard";
const testHostName = process.env.TEST_HOSTNAME ?? "127.0.0.1";
const testPort = +(process.env.TEST_PORT ?? 8080);

const testServerOptions: PreviewOptions = {
  root: testHostRoot,
  hostname: testHostName,
  port: testPort,
  verbose: true
};

const testServerUrl = `http://${testHostName}:${testPort}`;
chai.use(chaiHttp);

describe("preview server", () => {
  let testServer: PreviewServer["_server"];

  before(async () => {
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

  // TODO - tests for /_observablehq and data loader requests

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
