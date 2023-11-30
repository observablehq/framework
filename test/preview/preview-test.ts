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

  it("should start a server", (done) => {
    chai
      .request(testServerUrl)
      .get("/")
      .end(function (err, res) {
        expect(res.text);
        expect(res).to.have.status(200);
        done();
      });
  });

  it.skip("redirects /index to /", (done) => {
    chai
      .request(testServerUrl)
      .get("/index")
      .redirects(0)
      .end(function (err, res) {
        expect(res).to.redirectTo(/^\/$/);
        expect(res).to.have.status(302);
        done();
      });
  });

  it("serves nested pages", (done) => {
    chai
      .request(testServerUrl)
      .get("/code/code")
      .end(function (err, res) {
        assert.equal(res.statusCode, 200);
        expect(res.text).to.have.string("This text is not visible by default.");
        done();
      });
  });

  // TODO - tests for /_observablehq and data loader requests

  it("serves local imports", (done) => {
    chai
      .request(testServerUrl)
      .get("/_import/format.js")
      .end(function (err, res) {
        assert.equal(res.statusCode, 200);
        expect(res.text).to.have.string("function formatTitle(title)");
        done();
      });
  });

  it("handles missing imports", (done) => {
    chai
      .request(testServerUrl)
      .get("/_import/idontexist.js")
      .end(function (err, res) {
        assert.equal(res.statusCode, 404);
        expect(res.text).to.have.string("404 page");
        done();
      });
  });

  it("serves local files", (done) => {
    chai
      .request(testServerUrl)
      .get("/_file/file.csv")
      .end(function (err, res) {
        assert.equal(res.statusCode, 200);
        assert.ok(res.text);
        done();
      });
  });

  it("handles missing files", (done) => {
    chai
      .request(testServerUrl)
      .get("/_file/idontexist.csv")
      .end(function (err, res) {
        assert.equal(res.statusCode, 404);
        expect(res.text).to.have.string("404 page");
        done();
      });
  });
});
