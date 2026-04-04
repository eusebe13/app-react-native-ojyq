/**
 * Availability Coverage Utilities
 *
 * Provides pure functions for merging overlapping time intervals and computing
 * unique coverage hours across multiple member availability records.
 *
 * Pattern: Strategy — data transformation (recordToInterval) is decoupled from
 * the merge algorithm (mergeIntervals) so each can vary independently.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A half-open time interval expressed in minutes from midnight [start, end). */
export interface TimeInterval {
  startMinutes: number;
  endMinutes: number;
}

/** Shape of an availability document stored in Firestore. */
export interface AvailabilityRecord {
  id: string;
  days: string[];
  startHours: number;
  startMinutes: number;
  endHours: number;
  endMinutes: number;
}

/** Per-day summary returned by calculateWeeklyCoverage. */
export interface DailyCoverage {
  dayName: string;
  coveredHours: number;
  targetHours: number;
  /** 0-100, capped at 100 even when coveredHours > targetHours */
  progressPercent: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAILY_TARGET_HOURS = 8;

export const DAYS_OF_WEEK = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export type DayName = (typeof DAYS_OF_WEEK)[number];

// ─── Core Algorithm ───────────────────────────────────────────────────────────

/**
 * Converts a Firestore AvailabilityRecord into a TimeInterval (minutes).
 * Pure function — no side effects.
 */
export function recordToInterval(record: AvailabilityRecord): TimeInterval {
  return {
    startMinutes: record.startHours * 60 + record.startMinutes,
    endMinutes: record.endHours * 60 + record.endMinutes,
  };
}

/**
 * Merges overlapping or adjacent time intervals to eliminate double-counting.
 *
 * Algorithm: sort by start time, then sweep and extend the last merged
 * interval whenever the next interval overlaps it.
 *
 * Time complexity : O(n log n)  — sort dominates
 * Space complexity: O(n)
 *
 * @example
 * // Member A 08:00–12:00 (480–720), Member B 10:00–15:00 (600–900)
 * mergeIntervals([{480,720},{600,900}]) → [{480,900}]  // 7 h unique
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => a.startMinutes - b.startMinutes,
  );

  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];

    if (cur.startMinutes <= last.endMinutes) {
      // Overlapping or adjacent — extend end if needed
      last.endMinutes = Math.max(last.endMinutes, cur.endMinutes);
    } else {
      merged.push({ ...cur });
    }
  }

  return merged;
}

/**
 * Returns the total unique minutes covered by a list of already-merged
 * (non-overlapping) intervals.
 */
export function calculateCoverageMinutes(merged: TimeInterval[]): number {
  return merged.reduce(
    (sum, iv) => sum + Math.max(0, iv.endMinutes - iv.startMinutes),
    0,
  );
}

// ─── Higher-level helpers ─────────────────────────────────────────────────────

/**
 * Calculates the total unique coverage hours for a specific day name,
 * merging contributions from all provided availability records.
 */
export function calculateDailyCoverage(
  availabilities: AvailabilityRecord[],
  dayName: string,
): number {
  const intervals = availabilities
    .filter((a) => Array.isArray(a.days) && a.days.includes(dayName))
    .map(recordToInterval)
    .filter((iv) => iv.endMinutes > iv.startMinutes); // discard zero-length

  const merged = mergeIntervals(intervals);
  return calculateCoverageMinutes(merged) / 60;
}

/**
 * Calculates weekly coverage for all 7 days and returns an array of
 * DailyCoverage objects ready for charting.
 */
export function calculateWeeklyCoverage(
  availabilities: AvailabilityRecord[],
): DailyCoverage[] {
  return DAYS_OF_WEEK.map((dayName) => {
    const coveredHours = calculateDailyCoverage(availabilities, dayName);
    return {
      dayName,
      coveredHours,
      targetHours: DAILY_TARGET_HOURS,
      progressPercent:
        Math.min(coveredHours / DAILY_TARGET_HOURS, 1) * 100,
    };
  });
}
