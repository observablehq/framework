import assert from "node:assert";
import {formatByteSize, formatIsoDate, formatLocaleDate} from "../src/format.js";

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

describe("formatByteSize", () => {
  it("returns a human-readable byte size", () => {
    assert.strictEqual(formatByteSize(0), "0 B");
    assert.strictEqual(formatByteSize(500), "500 B");
    assert.strictEqual(formatByteSize(999), "999 B");
    assert.strictEqual(formatByteSize(999.49), "999 B");
    assert.strictEqual(formatByteSize(999.51), "1 kB");
    assert.strictEqual(formatByteSize(1200), "1.2 kB");
    assert.strictEqual(formatByteSize(1_500), "1.5 kB");
    assert.strictEqual(formatByteSize(3_000), "3 kB");
    assert.strictEqual(formatByteSize(400_000), "400 kB");
    assert.strictEqual(formatByteSize(50_000_000), "50 MB");
    assert.strictEqual(formatByteSize(1_250_000_000), "1.25 GB");
    assert.strictEqual(formatByteSize(1_500_000_000), "1.5 GB");
    assert.strictEqual(formatByteSize(3_000_000_000), "3 GB");
    assert.strictEqual(formatByteSize(600_000_000_000), "600 GB");
    assert.strictEqual(formatByteSize(60_598_160), "60.6 MB");
    assert.strictEqual(formatByteSize(60_598_160_000), "60.6 GB");
    assert.strictEqual(formatByteSize(60_598_160_000_000), "60,600 GB");
  });
});
