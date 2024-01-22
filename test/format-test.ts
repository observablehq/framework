import assert from "node:assert";
import {formatIsoDate, formatLocaleDate} from "../src/format.js";

describe("formatIsoDate", () => {
  it("returns an ISO 8601 string in local time", () => {
    assert.strictEqual(formatIsoDate(new Date("2013-01-02")), "2013-01-01T16:00:00");
    assert.strictEqual(formatIsoDate(new Date("2013-01-02T08:00:00")), "2013-01-02T08:00:00");
    assert.strictEqual(formatIsoDate(new Date("2013-01-02T08:00:00Z")), "2013-01-02T00:00:00");
  });
});

describe("formatLocaleDate", () => {
  it("returns an string formatted for en-US", () => {
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02")), "Jan 1, 2013");
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02T08:00:00")), "Jan 2, 2013");
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02T08:00:00Z")), "Jan 2, 2013");
  });
  it("respects the specified locale", () => {
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02"), "fr-FR"), "1 janv. 2013");
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02T08:00:00"), "fr-FR"), "2 janv. 2013");
    assert.strictEqual(formatLocaleDate(new Date("2013-01-02T08:00:00Z"), "fr-FR"), "2 janv. 2013");
  });
});
