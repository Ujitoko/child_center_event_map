const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeText,
  normalizeJaDigits,
  sanitizeGeoQueryText,
  sanitizeAddressText,
  sanitizeVenueText,
  scoreJapaneseText,
} = require("../src/server/text-utils");

describe("normalizeText", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(normalizeText("  hello   world  "), "hello world");
  });
  it("returns empty string for null/undefined", () => {
    assert.equal(normalizeText(null), "");
    assert.equal(normalizeText(undefined), "");
  });
  it("handles Japanese text", () => {
    assert.equal(normalizeText("  東京都　世田谷区  "), "東京都 世田谷区");
  });
});

describe("normalizeJaDigits (normalizeFullwidthDigits)", () => {
  it("converts fullwidth digits to halfwidth", () => {
    assert.equal(normalizeJaDigits("１２３"), "123");
  });
  it("converts fullwidth colon", () => {
    assert.equal(normalizeJaDigits("１０：３０"), "10:30");
  });
  it("passes through normal text", () => {
    assert.equal(normalizeJaDigits("hello"), "hello");
  });
});

describe("sanitizeGeoQueryText", () => {
  it("removes postal codes", () => {
    const result = sanitizeGeoQueryText("〒154-0004 世田谷区太子堂");
    assert.ok(!result.includes("154-0004"));
    assert.ok(result.includes("世田谷区太子堂"));
  });
  it("truncates after contact keywords", () => {
    const result = sanitizeGeoQueryText("世田谷区太子堂 電話 03-1234-5678");
    assert.ok(!result.includes("03-1234-5678"));
  });
});

describe("sanitizeAddressText", () => {
  it("keeps valid address", () => {
    const result = sanitizeAddressText("東京都世田谷区太子堂1-2-3");
    assert.ok(result.includes("世田谷区太子堂1-2-3"));
  });
  it("returns empty for copyright text", () => {
    assert.equal(sanitizeAddressText("copyright 2024 All rights reserved"), "");
  });
  it("returns empty for zip-only text", () => {
    assert.equal(sanitizeAddressText("154-0004"), "");
  });
});

describe("scoreJapaneseText", () => {
  it("scores higher for Japanese text", () => {
    const jaScore = scoreJapaneseText("東京都世田谷区の児童館イベント");
    const enScore = scoreJapaneseText("Hello world this is English text");
    assert.ok(jaScore > enScore);
  });
  it("returns 0 for empty text", () => {
    assert.equal(scoreJapaneseText(""), 0);
  });
});
