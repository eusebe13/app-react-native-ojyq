/**
 * Unit tests for availability coverage utilities.
 *
 * Run with: npx jest utils/__tests__/availabilityUtils.test.ts
 */

import {
  calculateCoverageMinutes,
  calculateDailyCoverage,
  calculateWeeklyCoverage,
  DAILY_TARGET_HOURS,
  mergeIntervals,
  recordToInterval,
  type AvailabilityRecord,
  type TimeInterval,
} from "../availabilityUtils";

// ─── recordToInterval ────────────────────────────────────────────────────────

describe("recordToInterval", () => {
  it("converts hours and minutes to total minutes from midnight", () => {
    const record: AvailabilityRecord = {
      id: "1",
      days: ["Lundi"],
      startHours: 8,
      startMinutes: 30,
      endHours: 12,
      endMinutes: 0,
    };
    expect(recordToInterval(record)).toEqual({ startMinutes: 510, endMinutes: 720 });
  });

  it("handles midnight boundaries (00:00 → 0 minutes)", () => {
    const record: AvailabilityRecord = {
      id: "2",
      days: ["Mardi"],
      startHours: 0,
      startMinutes: 0,
      endHours: 0,
      endMinutes: 30,
    };
    expect(recordToInterval(record)).toEqual({ startMinutes: 0, endMinutes: 30 });
  });
});

// ─── mergeIntervals ──────────────────────────────────────────────────────────

describe("mergeIntervals", () => {
  it("returns empty array for empty input", () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it("returns a single interval unchanged", () => {
    const intervals: TimeInterval[] = [{ startMinutes: 480, endMinutes: 720 }];
    expect(mergeIntervals(intervals)).toEqual([{ startMinutes: 480, endMinutes: 720 }]);
  });

  it("merges two overlapping intervals (key example from spec)", () => {
    // Member A 08:00–12:00 (480–720), Member B 10:00–15:00 (600–900)
    // Expected: [08:00–15:00] = 7h
    const intervals: TimeInterval[] = [
      { startMinutes: 480, endMinutes: 720 },
      { startMinutes: 600, endMinutes: 900 },
    ];
    const result = mergeIntervals(intervals);
    expect(result).toEqual([{ startMinutes: 480, endMinutes: 900 }]);
  });

  it("merges adjacent (touching) intervals", () => {
    const intervals: TimeInterval[] = [
      { startMinutes: 480, endMinutes: 720 },
      { startMinutes: 720, endMinutes: 900 },
    ];
    expect(mergeIntervals(intervals)).toEqual([{ startMinutes: 480, endMinutes: 900 }]);
  });

  it("keeps non-overlapping intervals separate", () => {
    const intervals: TimeInterval[] = [
      { startMinutes: 480, endMinutes: 600 },
      { startMinutes: 720, endMinutes: 840 },
    ];
    expect(mergeIntervals(intervals)).toEqual([
      { startMinutes: 480, endMinutes: 600 },
      { startMinutes: 720, endMinutes: 840 },
    ]);
  });

  it("handles unsorted input correctly", () => {
    const intervals: TimeInterval[] = [
      { startMinutes: 720, endMinutes: 900 },
      { startMinutes: 480, endMinutes: 720 },
    ];
    expect(mergeIntervals(intervals)).toEqual([{ startMinutes: 480, endMinutes: 900 }]);
  });

  it("merges three overlapping intervals into one", () => {
    const intervals: TimeInterval[] = [
      { startMinutes: 480, endMinutes: 720 },
      { startMinutes: 600, endMinutes: 900 },
      { startMinutes: 800, endMinutes: 1020 },
    ];
    expect(mergeIntervals(intervals)).toEqual([{ startMinutes: 480, endMinutes: 1020 }]);
  });

  it("does not mutate the original array", () => {
    const intervals: TimeInterval[] = [
      { startMinutes: 600, endMinutes: 900 },
      { startMinutes: 480, endMinutes: 720 },
    ];
    const copy = intervals.map((iv) => ({ ...iv }));
    mergeIntervals(intervals);
    expect(intervals).toEqual(copy);
  });
});

// ─── calculateCoverageMinutes ────────────────────────────────────────────────

describe("calculateCoverageMinutes", () => {
  it("returns 0 for empty array", () => {
    expect(calculateCoverageMinutes([])).toBe(0);
  });

  it("sums durations of non-overlapping intervals", () => {
    const merged: TimeInterval[] = [
      { startMinutes: 480, endMinutes: 600 },  // 2h
      { startMinutes: 720, endMinutes: 840 },  // 2h
    ];
    expect(calculateCoverageMinutes(merged)).toBe(240);
  });

  it("returns 420 minutes (7h) for spec example after merge", () => {
    const merged = mergeIntervals([
      { startMinutes: 480, endMinutes: 720 },
      { startMinutes: 600, endMinutes: 900 },
    ]);
    expect(calculateCoverageMinutes(merged)).toBe(420);
  });
});

// ─── calculateDailyCoverage ──────────────────────────────────────────────────

describe("calculateDailyCoverage", () => {
  const availabilities: AvailabilityRecord[] = [
    { id: "a1", days: ["Lundi"], startHours: 8, startMinutes: 0, endHours: 12, endMinutes: 0 },
    { id: "a2", days: ["Lundi", "Mardi"], startHours: 10, startMinutes: 0, endHours: 15, endMinutes: 0 },
  ];

  it("returns 7h for Lundi (spec example: 08:00–12:00 + 10:00–15:00)", () => {
    expect(calculateDailyCoverage(availabilities, "Lundi")).toBeCloseTo(7);
  });

  it("returns 5h for Mardi (only a2: 10:00–15:00)", () => {
    expect(calculateDailyCoverage(availabilities, "Mardi")).toBeCloseTo(5);
  });

  it("returns 0 for a day with no availabilities", () => {
    expect(calculateDailyCoverage(availabilities, "Samedi")).toBe(0);
  });

  it("returns 0 for empty availabilities array", () => {
    expect(calculateDailyCoverage([], "Lundi")).toBe(0);
  });
});

// ─── calculateWeeklyCoverage ─────────────────────────────────────────────────

describe("calculateWeeklyCoverage", () => {
  it("returns 7 entries (one per day)", () => {
    const result = calculateWeeklyCoverage([]);
    expect(result).toHaveLength(7);
  });

  it("sets progressPercent to 0 for empty availabilities", () => {
    const result = calculateWeeklyCoverage([]);
    result.forEach((d) => expect(d.progressPercent).toBe(0));
  });

  it("caps progressPercent at 100 even when coverage exceeds target", () => {
    // 16h coverage far exceeds 8h target
    const availabilities: AvailabilityRecord[] = [
      { id: "x", days: ["Lundi"], startHours: 0, startMinutes: 0, endHours: 16, endMinutes: 0 },
    ];
    const result = calculateWeeklyCoverage(availabilities);
    const lundi = result.find((d) => d.dayName === "Lundi")!;
    expect(lundi.progressPercent).toBe(100);
  });

  it("sets targetHours to DAILY_TARGET_HOURS for every day", () => {
    const result = calculateWeeklyCoverage([]);
    result.forEach((d) => expect(d.targetHours).toBe(DAILY_TARGET_HOURS));
  });
});
