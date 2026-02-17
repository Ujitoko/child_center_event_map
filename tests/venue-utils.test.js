const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { extractVenueFromTitle, isLikelyAudienceText } = require("../src/server/venue-utils");

describe("extractVenueFromTitle", () => {
  it("extracts jidokan name from title", () => {
    assert.equal(extractVenueFromTitle("弦巻児童館 おはなし会"), "弦巻児童館");
  });
  it("extracts kosodate hiroba", () => {
    assert.equal(extractVenueFromTitle("上北沢子育て児童ひろば 赤ちゃんタイム"), "上北沢子育て児童ひろば");
  });
  it("falls back to default", () => {
    assert.equal(extractVenueFromTitle("イベント開催のお知らせ"), "世田谷区児童館");
  });
});

describe("isLikelyAudienceText", () => {
  it("returns true for audience descriptions", () => {
    assert.equal(isLikelyAudienceText("どなたでも"), true);
    assert.equal(isLikelyAudienceText("小学生"), true);
    assert.equal(isLikelyAudienceText("乳幼児"), true);
    assert.equal(isLikelyAudienceText("親子"), true);
  });
  it("returns false for venue names", () => {
    assert.equal(isLikelyAudienceText("代田児童館"), false);
    assert.equal(isLikelyAudienceText("子育てひろば"), false);
  });
  it("returns false for empty/null", () => {
    assert.equal(isLikelyAudienceText(""), false);
    assert.equal(isLikelyAudienceText(null), false);
  });
});
