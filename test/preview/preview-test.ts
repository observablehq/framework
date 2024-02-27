import chai, {assert, expect} from "chai";
import chaiHttp from "chai-http";
import {normalizeConfig} from "../../src/config.js";
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
      config: await normalizeConfig({root: testHostRoot}),
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
