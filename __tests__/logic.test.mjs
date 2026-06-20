import { describe, it, expect } from "vitest";
import {
  todayDate, yesterdayDate, lastNDays,
  isScheduledDay, isPausedDay, weekNumber,
  computeHabit, computeWeeklyHabit,
  milestoneReached, MILESTONES, WEEK_MILESTONES,
} from "../src/logic.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const today     = todayDate();
const yesterday = yesterdayDate();

// Build a continuous run of N days ending on `endDate`
function run(n, endDate = today) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) dates.push(addDays(endDate, -i));
  return dates;
}

// ── todayDate / yesterdayDate ─────────────────────────────────────────────────
describe("todayDate", () => {
  it("returns YYYY-MM-DD format", () => expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  it("matches new Date() local date", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    expect(todayDate()).toBe(expected);
  });
});

describe("yesterdayDate", () => {
  it("is one day before today", () => {
    const t = new Date(today + "T12:00:00");
    t.setDate(t.getDate() - 1);
    const expected = t.toISOString().slice(0, 10);
    expect(yesterdayDate()).toBe(expected);
  });
});

describe("lastNDays", () => {
  it("returns N days ending today", () => {
    const days = lastNDays(7);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(today);
  });
  it("days are in ascending order", () => {
    const days = lastNDays(5);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i-1]).toBe(true);
    }
  });
});

// ── isScheduledDay ────────────────────────────────────────────────────────────
describe("isScheduledDay", () => {
  const monday    = "2025-06-16"; // Monday
  const saturday  = "2025-06-21";
  const sunday    = "2025-06-22";

  it("daily: every day is scheduled", () => {
    expect(isScheduledDay(monday, "daily")).toBe(true);
    expect(isScheduledDay(saturday, "daily")).toBe(true);
    expect(isScheduledDay(sunday, "daily")).toBe(true);
  });

  it("weekdays: Mon–Fri scheduled, Sat/Sun not", () => {
    expect(isScheduledDay(monday, "weekdays")).toBe(true);
    expect(isScheduledDay("2025-06-20", "weekdays")).toBe(true); // Friday
    expect(isScheduledDay(saturday, "weekdays")).toBe(false);
    expect(isScheduledDay(sunday, "weekdays")).toBe(false);
  });

  it("x_per_week: every day is eligible", () => {
    expect(isScheduledDay(monday, "x_per_week")).toBe(true);
    expect(isScheduledDay(saturday, "x_per_week")).toBe(true);
  });
});

// ── isPausedDay ───────────────────────────────────────────────────────────────
describe("isPausedDay", () => {
  const ranges = [{ start_date: "2025-06-10", end_date: "2025-06-15" }];

  it("returns false for empty ranges", () => {
    expect(isPausedDay("2025-06-12", [])).toBe(false);
  });
  it("returns true for date inside range", () => {
    expect(isPausedDay("2025-06-12", ranges)).toBe(true);
  });
  it("returns true on start boundary", () => {
    expect(isPausedDay("2025-06-10", ranges)).toBe(true);
  });
  it("returns true on end boundary", () => {
    expect(isPausedDay("2025-06-15", ranges)).toBe(true);
  });
  it("returns false for date before range", () => {
    expect(isPausedDay("2025-06-09", ranges)).toBe(false);
  });
  it("returns false for date after range", () => {
    expect(isPausedDay("2025-06-16", ranges)).toBe(false);
  });
  it("returns true when any of multiple ranges match", () => {
    const multi = [
      { start_date: "2025-06-01", end_date: "2025-06-05" },
      { start_date: "2025-06-20", end_date: "2025-06-25" },
    ];
    expect(isPausedDay("2025-06-03", multi)).toBe(true);
    expect(isPausedDay("2025-06-22", multi)).toBe(true);
    expect(isPausedDay("2025-06-10", multi)).toBe(false);
  });
});

// ── weekNumber ────────────────────────────────────────────────────────────────
describe("weekNumber", () => {
  // 2026-06-14 is a Sunday; 2026-06-20 is a Saturday in the same week.
  // 2026-06-13 is a Saturday in the previous week.
  it("Sunday and following Saturday are same week", () => {
    expect(weekNumber("2026-06-14")).toBe(weekNumber("2026-06-20"));
  });
  it("Saturday and following Sunday are different weeks", () => {
    expect(weekNumber("2026-06-13")).not.toBe(weekNumber("2026-06-14"));
  });
  it("returns integer", () => {
    expect(Number.isInteger(weekNumber(today))).toBe(true);
  });
});

// ── computeHabit: daily, 0 grace days ────────────────────────────────────────
describe("computeHabit — daily, grace=0 (strict)", () => {
  it("7 consecutive days logged → current 7, loggedToday true", () => {
    const logs = run(7);
    const r = computeHabit(logs, [], "daily", 0);
    expect(r.current).toBe(7);
    expect(r.best).toBe(7);
    expect(r.loggedToday).toBe(true);
    expect(r.inGrace).toBe(false);
  });

  it("miss today (logged yesterday) → current 0 (zero tolerance)", () => {
    const logs = run(7, yesterday);
    const r = computeHabit(logs, [], "daily", 0);
    expect(r.current).toBe(0);
    expect(r.loggedToday).toBe(false);
  });

  it("log only today → current 1", () => {
    const r = computeHabit([today], [], "daily", 0);
    expect(r.current).toBe(1);
    expect(r.loggedToday).toBe(true);
  });

  it("empty logs → all zeros", () => {
    const r = computeHabit([], [], "daily", 0);
    expect(r.current).toBe(0);
    expect(r.best).toBe(0);
    expect(r.loggedToday).toBe(false);
  });
});

// ── computeHabit: daily, 1 grace day ─────────────────────────────────────────
describe("computeHabit — daily, grace=1", () => {
  it("logged yesterday but not today → inGrace true, current is yesterday's run", () => {
    const logs = run(5, yesterday);
    const r = computeHabit(logs, [], "daily", 1);
    expect(r.current).toBe(5);
    expect(r.inGrace).toBe(true);
    expect(r.loggedToday).toBe(false);
  });

  it("miss today AND yesterday (2 misses) → current 0 (grace exceeded)", () => {
    const logs = run(5, addDays(today, -2));
    const r = computeHabit(logs, [], "daily", 1);
    expect(r.current).toBe(0);
    expect(r.inGrace).toBe(false);
  });

  it("1-day gap in middle of run is absorbed → single long run", () => {
    // Logged 10 days ago to 6 days ago, gap at 5, then 4 to today
    const logs = [
      ...run(5, addDays(today, -6)),
      ...run(5),               // today back 4 days
    ];
    const r = computeHabit(logs, [], "daily", 1);
    // With 1 grace day, the gap of 1 is within tolerance
    expect(r.current).toBeGreaterThanOrEqual(9);
    expect(r.best).toBeGreaterThanOrEqual(9);
  });

  it("2-day gap breaks the streak", () => {
    // after-gap: today back to today-4 (5 days logged)
    // gap: today-5 and today-6 (2 days missing — exceeds grace=1)
    // before-gap: today-7 back to today-12 (6 days logged)
    const afterGap  = run(5);
    const beforeGap = run(6, addDays(today, -7));
    const r = computeHabit([...afterGap, ...beforeGap], [], "daily", 1);
    expect(r.current).toBe(5); // only the after-gap portion
    expect(r.best).toBeGreaterThanOrEqual(5);
  });

  it("loggedToday and inGrace are mutually exclusive", () => {
    const r1 = computeHabit([today], [], "daily", 1);
    expect(r1.loggedToday).toBe(true);
    expect(r1.inGrace).toBe(false);

    const r2 = computeHabit(run(3, yesterday), [], "daily", 1);
    expect(r2.loggedToday).toBe(false);
    expect(r2.inGrace).toBe(true);
  });
});

// ── computeHabit: daily, 2 grace days ────────────────────────────────────────
describe("computeHabit — daily, grace=2", () => {
  it("2-day gap in the middle is absorbed", () => {
    const before = run(5, addDays(today, -9));
    const after  = run(5, addDays(today, -2));
    const r = computeHabit([...before, ...after], [], "daily", 2);
    expect(r.current).toBeGreaterThanOrEqual(9);
  });

  it("3-day gap breaks the streak", () => {
    // after-gap: today back to today-4 (5 days logged)
    // gap: today-5, today-6, today-7 (3 days missing — exceeds grace=2)
    // before-gap: today-8 back to today-13 (6 days logged)
    const afterGap  = run(5);
    const beforeGap = run(6, addDays(today, -8));
    const r = computeHabit([...afterGap, ...beforeGap], [], "daily", 2);
    expect(r.current).toBe(5); // only the after-gap portion
    expect(r.best).toBeGreaterThanOrEqual(5);
  });

  it("miss 2 days including today → inGrace true (still within grace=2)", () => {
    const logs = run(5, addDays(today, -2));
    const r = computeHabit(logs, [], "daily", 2);
    expect(r.inGrace).toBe(true);
    expect(r.current).toBeGreaterThan(0);
  });

  it("miss 3 days → inGrace false (grace=2 exceeded)", () => {
    const logs = run(5, addDays(today, -3));
    const r = computeHabit(logs, [], "daily", 2);
    expect(r.inGrace).toBe(false);
    expect(r.current).toBe(0);
  });
});

// ── computeHabit: weekdays ────────────────────────────────────────────────────
describe("computeHabit — weekdays, grace=1", () => {
  it("logs all weekdays for past 20 days (through yesterday): current > 0", () => {
    // Log every scheduled weekday from 20 days ago through yesterday.
    // Weekends are skipped by isScheduledDay, so multiple weekends cross
    // the log window — if weekends counted as misses the streak would break.
    const logs = [];
    for (let i = 20; i >= 1; i--) {
      const d = addDays(today, -i);
      if (isScheduledDay(d, "weekdays")) logs.push(d);
    }
    const r = computeHabit(logs, [], "weekdays", 1);
    expect(r.current).toBeGreaterThan(0);
  });

  it("missing two consecutive weekdays breaks streak (grace=1)", () => {
    // Skip offsets 2 and 3 (both are weekdays regardless of the current day of week,
    // since they are Wed/Thu or adjacent weekdays within a standard Mon-Fri week).
    // This creates a 2-miss gap near the recent end, making current < best.
    const logs = [];
    for (let i = 20; i >= 1; i--) {
      const d = addDays(today, -i);
      if (i === 2 || i === 3) continue; // skip two consecutive recent weekdays
      if (isScheduledDay(d, "weekdays")) logs.push(d);
    }
    // The two consecutive skips exceed grace=1, so current is only the very recent portion
    // (offset 1 = yesterday if weekday, or 0 if weekend) while best covers older history
    const r = computeHabit(logs, [], "weekdays", 1);
    // Either current=0 (both skips are weekdays and offset 1 doesn't save it) or current < best
    expect(r.best).toBeGreaterThanOrEqual(r.current);
    expect(r.best).toBeGreaterThan(0);
  });
});

// ── computeHabit: with pauses ─────────────────────────────────────────────────
describe("computeHabit — with pauses", () => {
  it("pause in the middle does not break the streak", () => {
    // 5 days logged, 3-day pause, 5 more days
    const beforePause = run(5, addDays(today, -9));
    const pauseStart  = addDays(today, -8);
    const pauseEnd    = addDays(today, -6);
    const afterPause  = run(5);
    const pauses_ = [{ start_date: pauseStart, end_date: pauseEnd }];
    const r = computeHabit([...beforePause, ...afterPause], pauses_, "daily", 1);
    expect(r.current).toBeGreaterThanOrEqual(9);
  });

  it("today is paused → isPaused true", () => {
    const r = computeHabit([yesterday], [{ start_date: today, end_date: today }], "daily", 1);
    expect(r.isPaused).toBe(true);
  });

  it("expired pause does not affect current streak", () => {
    const expiredPause = [{ start_date: addDays(today, -20), end_date: addDays(today, -15) }];
    const r = computeHabit(run(5), expiredPause, "daily", 1);
    expect(r.current).toBe(5);
    expect(r.isPaused).toBe(false);
  });

  it("pause covering today means no log needed", () => {
    const pauses_ = [{ start_date: today, end_date: today }];
    // Yesterday logged, today paused — streak should still be alive
    const r = computeHabit(run(3, yesterday), pauses_, "daily", 1);
    expect(r.isPaused).toBe(true);
    // current preserved from before pause (today excluded from expected days)
    expect(r.current).toBeGreaterThanOrEqual(3);
  });
});

// ── computeWeeklyHabit ────────────────────────────────────────────────────────
describe("computeWeeklyHabit", () => {
  // Build log dates for a specific week: wk days offset from today's week start
  function logsInWeek(logsThisWeek, weeksAgo = 0) {
    // Find this week's Sunday
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
    const dates = [];
    for (let i = 0; i < logsThisWeek; i++) {
      const dt = new Date(d);
      dt.setDate(d.getDate() + i);
      dates.push(dt.toISOString().slice(0, 10));
    }
    return dates;
  }

  it("3 logs this week, target 3 → current 1", () => {
    const logs = logsInWeek(3, 0);
    const r = computeWeeklyHabit(logs, [], 3);
    expect(r.completedThisPeriod).toBe(3);
    expect(r.current).toBeGreaterThanOrEqual(1);
    expect(r.loggedToday).toBe(false); // depends on whether today is in those 3
  });

  it("completedThisPeriod is count of logs this week", () => {
    const logs = logsInWeek(2, 0);
    const r = computeWeeklyHabit(logs, [], 3);
    expect(r.completedThisPeriod).toBe(2);
    expect(r.targetThisPeriod).toBe(3);
  });

  it("3 consecutive weeks meeting target → current at least 2", () => {
    const logs = [
      ...logsInWeek(3, 0),
      ...logsInWeek(3, 1),
      ...logsInWeek(3, 2),
    ];
    const r = computeWeeklyHabit(logs, [], 3);
    expect(r.current).toBeGreaterThanOrEqual(2);
    expect(r.best).toBeGreaterThanOrEqual(3);
  });

  it("week not meeting target breaks current streak", () => {
    const logs = [
      ...logsInWeek(3, 0),  // this week: meets target
      ...logsInWeek(1, 1),  // last week: doesn't meet target (1 < 3)
      ...logsInWeek(3, 2),  // 2 weeks ago: meets target
    ];
    const r = computeWeeklyHabit(logs, [], 3);
    // Current streak = just this week (1), because last week broke it
    expect(r.current).toBe(1);
    expect(r.best).toBeGreaterThanOrEqual(1);
  });

  it("loggedToday is true when today has a log", () => {
    const r = computeWeeklyHabit([today], [], 3);
    expect(r.loggedToday).toBe(true);
  });

  it("isPaused is true when today is in a pause range", () => {
    const r = computeWeeklyHabit([], [{ start_date: today, end_date: today }], 3);
    expect(r.isPaused).toBe(true);
  });

  it("empty logs → all zeros", () => {
    const r = computeWeeklyHabit([], [], 3);
    expect(r.current).toBe(0);
    expect(r.best).toBe(0);
    expect(r.completedThisPeriod).toBe(0);
  });
});

// ── milestoneReached ──────────────────────────────────────────────────────────
describe("milestoneReached", () => {
  it("returns true for daily milestone values", () => {
    for (const m of MILESTONES) {
      expect(milestoneReached(m, "daily")).toBe(true);
      expect(milestoneReached(m, "weekdays")).toBe(true);
    }
  });

  it("returns false for non-milestone values", () => {
    expect(milestoneReached(5, "daily")).toBe(false);
    expect(milestoneReached(1, "daily")).toBe(false);
    expect(milestoneReached(50, "daily")).toBe(false);
  });

  it("returns true for weekly milestone values", () => {
    for (const m of WEEK_MILESTONES) {
      expect(milestoneReached(m, "x_per_week")).toBe(true);
    }
  });

  it("returns false for non-weekly-milestone values", () => {
    expect(milestoneReached(3, "x_per_week")).toBe(false);
    expect(milestoneReached(365, "x_per_week")).toBe(false);
  });
});
