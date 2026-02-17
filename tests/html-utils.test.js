const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { stripTags, parseAnchors } = require("../src/server/html-utils");

describe("stripTags", () => {
  it("removes HTML tags", () => {
    assert.equal(stripTags("<p>hello</p>"), "hello");
  });
  it("converts br to space", () => {
    assert.equal(stripTags("hello<br>world"), "hello world");
  });
  it("decodes &nbsp; and &amp;", () => {
    assert.equal(stripTags("A&nbsp;B&amp;C"), "A B&C");
  });
  it("handles null/undefined", () => {
    assert.equal(stripTags(null), "");
    assert.equal(stripTags(undefined), "");
  });
  it("collapses whitespace", () => {
    assert.equal(stripTags("<p>  hello  </p>  <p>  world  </p>"), "hello world");
  });
});

describe("parseAnchors", () => {
  it("extracts href and text", () => {
    const html = '<a href="/path/to/page">Link Text</a>';
    const result = parseAnchors(html, "https://example.com");
    assert.equal(result.length, 1);
    assert.equal(result[0].url, "https://example.com/path/to/page");
    assert.equal(result[0].text, "Link Text");
  });
  it("handles absolute URLs", () => {
    const html = '<a href="https://other.com/page">外部</a>';
    const result = parseAnchors(html, "https://example.com");
    assert.equal(result[0].url, "https://other.com/page");
  });
  it("skips javascript: and # links", () => {
    const html = '<a href="javascript:void(0)">X</a><a href="#top">Y</a>';
    const result = parseAnchors(html, "https://example.com");
    assert.equal(result.length, 0);
  });
  it("extracts multiple anchors", () => {
    const html = '<a href="/a">A</a><a href="/b">B</a>';
    const result = parseAnchors(html, "https://example.com");
    assert.equal(result.length, 2);
  });
});
