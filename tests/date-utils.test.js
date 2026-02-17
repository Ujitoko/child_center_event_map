const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  toJstDate,
  parseYmdFromJst,
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
  parseDatesFromHtml,
} = require("../src/server/date-utils");

describe("toJstDate", () => {
  it("creates correct UTC date from JST parameters", () => {
    const d = toJstDate(2026, 2, 11, 10, 30);
    assert.equal(d.toISOString(), "2026-02-11T01:30:00.000Z");
  });
  it("defaults to 10:00 JST", () => {
    const d = toJstDate(2026, 1, 1);
    assert.equal(d.toISOString(), "2026-01-01T01:00:00.000Z");
  });
});

describe("parseYmdFromJst", () => {
  it("extracts JST year/month/day from a Date", () => {
    const d = new Date("2026-02-10T15:00:00.000Z"); // 2026-02-11 00:00 JST
    const result = parseYmdFromJst(d);
    assert.equal(result.y, 2026);
    assert.equal(result.m, 2);
    assert.equal(result.d, 11);
    assert.equal(result.key, "2026-02-11");
  });
});

describe("inRangeJst", () => {
  it("returns true for today", () => {
    const now = parseYmdFromJst(new Date());
    assert.equal(inRangeJst(now.y, now.m, now.d, 1), true);
  });
  it("returns false for far future", () => {
    assert.equal(inRangeJst(2099, 12, 31, 1), false);
  });
});

describe("buildStartsEndsForDate", () => {
  it("builds ISO strings with time range", () => {
    const d = { y: 2026, mo: 2, d: 11 };
    const timeRange = { startHour: 10, startMinute: 0, endHour: 12, endMinute: 30 };
    const result = buildStartsEndsForDate(d, timeRange);
    assert.equal(result.startsAt, "2026-02-11T01:00:00.000Z");
    assert.equal(result.endsAt, "2026-02-11T03:30:00.000Z");
    assert.equal(result.timeUnknown, false);
  });
  it("marks time_unknown when no time range", () => {
    const d = { y: 2026, mo: 2, d: 11 };
    const result = buildStartsEndsForDate(d, null);
    assert.equal(result.timeUnknown, true);
    assert.equal(result.endsAt, null);
  });
});

describe("parseTimeRangeFromText", () => {
  it("parses standard time range", () => {
    const r = parseTimeRangeFromText("10:00~12:00");
    assert.deepEqual(r, { startHour: 10, startMinute: 0, endHour: 12, endMinute: 0 });
  });
  it("parses Japanese-style time", () => {
    const r = parseTimeRangeFromText("午前10時30分～午後2時");
    assert.notEqual(r, null);
    assert.equal(r.startHour, 10);
    assert.equal(r.startMinute, 30);
    assert.equal(r.endHour, 14);
  });
  it("returns null for no time info", () => {
    assert.equal(parseTimeRangeFromText("児童館イベント"), null);
  });
});

describe("parseDatesFromHtml", () => {
  it("parses Japanese date format", () => {
    const dates = parseDatesFromHtml("開催日 2026年2月15日");
    assert.equal(dates.length, 1);
    assert.deepEqual(dates[0], { y: 2026, mo: 2, d: 15 });
  });
  it("parses slash date format", () => {
    const dates = parseDatesFromHtml("2026/03/01");
    assert.equal(dates.length, 1);
    assert.deepEqual(dates[0], { y: 2026, mo: 3, d: 1 });
  });
  it("deduplicates dates", () => {
    const dates = parseDatesFromHtml("2026年2月15日 開催: 2026年2月15日");
    assert.equal(dates.length, 1);
  });
});
