import { describe, expect, it } from "vitest";

import { followUpState, localInputsToIso, timeAgo, whenPhrase } from "./dates";

// Local wall-clock time, so the tests mean the same thing in any timezone.
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const now = at(2026, 5, 6, 12, 0); // Wed 6 May 2026, noon

describe("timeAgo", () => {
  it.each([
    [new Date(now.getTime() - 30_000), "just now"],
    [at(2026, 5, 6, 11, 58), "2 minutes ago"],
    [at(2026, 5, 6, 10, 0), "2 hours ago"],
    [at(2026, 5, 4, 12, 0), "2 days ago"],
    [at(2026, 4, 29, 12, 0), "1 week ago"],
    [at(2026, 4, 15, 12, 0), "3 weeks ago"],
  ])("%s → %s", (date, expected) => {
    expect(timeAgo(date.toISOString(), now)).toBe(expected);
  });
});

describe("followUpState", () => {
  it("is null without a follow-up", () => expect(followUpState(null, now)).toBeNull());
  it("is today for later today", () => expect(followUpState(at(2026, 5, 6, 14).toISOString(), now)).toBe("today"));
  it("is overdue once the time has passed, even today", () =>
    expect(followUpState(at(2026, 5, 6, 10).toISOString(), now)).toBe("overdue"));
  it("is overdue for an earlier day", () => expect(followUpState(at(2026, 5, 5, 16).toISOString(), now)).toBe("overdue"));
  it("is upcoming for a later day", () => expect(followUpState(at(2026, 5, 7, 9).toISOString(), now)).toBe("upcoming"));
});

describe("whenPhrase", () => {
  it.each([
    [at(2026, 5, 6, 14), "today at 2:00 PM"],
    [at(2026, 5, 7, 10), "tomorrow at 10:00 AM"],
    [at(2026, 5, 5, 16), "yesterday at 4:00 PM"],
    [at(2026, 5, 9, 11), "Sat at 11:00 AM"],
    [at(2026, 6, 20, 9, 30), "Jun 20 at 9:30 AM"],
    [at(2027, 1, 3, 9), "Jan 3, 2027 at 9:00 AM"],
  ])("%s → %s", (date, expected) => {
    expect(whenPhrase(date.toISOString(), now)).toBe(expected);
  });
});

describe("localInputsToIso", () => {
  it("reads the inputs as local time", () => {
    expect(localInputsToIso("2026-05-07", "14:30")).toBe(at(2026, 5, 7, 14, 30).toISOString());
  });
});
