const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { extractTokyoAddress } = require("../src/server/address-utils");

describe("extractTokyoAddress", () => {
  it("extracts full Tokyo address", () => {
    const result = extractTokyoAddress("場所: 東京都世田谷区太子堂1-2-3 中央図書館");
    assert.ok(result.includes("東京都世田谷区太子堂1-2-3"));
  });
  it("extracts ward-only address and prepends 東京都", () => {
    const result = extractTokyoAddress("品川区大井1-14-8");
    assert.ok(result.includes("東京都"));
    assert.ok(result.includes("品川区"));
  });
  it("returns empty for text without address", () => {
    assert.equal(extractTokyoAddress("児童館でイベントを開催します"), "");
  });
  it("returns empty for empty input", () => {
    assert.equal(extractTokyoAddress(""), "");
    assert.equal(extractTokyoAddress(null), "");
  });
});
