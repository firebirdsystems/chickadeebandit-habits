export function todayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n = 7) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

/**
 * Adds `n` days to a YYYY-MM-DD string, returns YYYY-MM-DD.
 */
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns day-of-week (0=Sun, 6=Sat) for a YYYY-MM-DD string.
 */
function dayOfWeek(dateStr) {
  return new Date(dateStr + "T12:00:00").getDay();
}

/**
 * Returns true if `dateStr` is a scheduled day for this frequency.
 */
export function isScheduledDay(dateStr, frequency) {
  if (frequency === "daily" || frequency === "x_per_week") return true;
  if (frequency === "weekdays") {
    const dow = dayOfWeek(dateStr);
    return dow >= 1 && dow <= 5;
  }
  return true;
}

/**
 * Returns true if `dateStr` falls within any pause range (inclusive).
 * pauseRanges: array of { start_date, end_date } (YYYY-MM-DD strings)
 */
export function isPausedDay(dateStr, pauseRanges) {
  if (!pauseRanges || pauseRanges.length === 0) return false;
  for (const { start_date, end_date } of pauseRanges) {
    if (dateStr >= start_date && dateStr <= end_date) return true;
  }
  return false;
}

/**
 * Returns a Sun-anchored week number (integer) for a YYYY-MM-DD string.
 * Uses UTC midnight to avoid DST off-by-one on week boundaries.
 */
export function weekNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateMs  = Date.UTC(y, m - 1, d);
  const epochMs = Date.UTC(2000, 0, 2); // 2000-01-02 UTC midnight (a Sunday)
  return Math.floor((dateMs - epochMs) / (7 * 24 * 60 * 60 * 1000));
}

export const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
export const WEEK_MILESTONES = [4, 8, 12, 26, 52];

export function milestoneReached(count, frequency) {
  const list = frequency === "x_per_week" ? WEEK_MILESTONES : MILESTONES;
  return list.includes(count);
}

/**
 * Computes habit stats for `daily` and `weekdays` frequency.
 *
 * Returns:
 *   current    — length of the current active run (in scheduled+logged days)
 *   best       — longest run ever
 *   loggedToday — whether today has a log
 *   inGrace    — today is unlogged but the streak is still alive (within grace window)
 *   isPaused   — today is inside a pause range
 */
// `today` is injected by the caller, which passes the HOUSEHOLD's day
// (hubToday). The todayDate() default keeps this pure and testable in Node, but
// it reads the VIEWER DEVICE's clock — relying on it makes a streak break or
// survive depending on which timezone the app happens to be open in.
export function computeHabit(logDates, pauseRanges, frequency, graceDays, today = todayDate()) {
  const logSet = new Set(logDates ?? []);
  const loggedToday = logSet.has(today);
  const isPaused = isPausedDay(today, pauseRanges ?? []);

  // Build ordered list of "expected days": scheduled + not paused, last 400 days → today
  const expected = [];
  for (let i = 399; i >= 0; i--) {
    const d = addDays(today, -i);
    if (isScheduledDay(d, frequency) && !isPausedDay(d, pauseRanges ?? [])) {
      expected.push(d);
    }
  }

  if (expected.length === 0) {
    return { current: 0, best: 0, loggedToday, inGrace: false, isPaused };
  }

  // Walk expected days descending, counting runs with grace tolerance.
  // missedCount tracks consecutive missed EXPECTED days.
  // When missedCount exceeds graceDays, the run ends.
  let best = 0;
  let runLen = 0;
  let missedCount = 0;
  let currentCaptured = false;
  let current = 0;
  let firstBreak = true; // first break from the end = captures "current"

  for (let i = expected.length - 1; i >= 0; i--) {
    const d = expected[i];
    if (logSet.has(d)) {
      runLen++;
      missedCount = 0;
    } else {
      missedCount++;
      if (missedCount > graceDays) {
        // Run has ended
        if (firstBreak) {
          current = runLen;
          currentCaptured = true;
          firstBreak = false;
        }
        if (runLen > best) best = runLen;
        runLen = 0;
        missedCount = 0;
      }
      // else: still within grace window, run continues (unlogged days don't add to runLen)
    }
  }

  // Final run at start of history
  if (runLen > best) best = runLen;
  if (!currentCaptured) current = runLen;

  // inGrace: today is unlogged, but we haven't exceeded graceDays yet
  // (missedCount from the most recent expected days that weren't logged)
  const inGrace = !loggedToday && current > 0 && !isPaused;

  return { current, best, loggedToday, inGrace, isPaused };
}

/**
 * Computes habit stats for `x_per_week` frequency.
 *
 * Returns:
 *   current           — consecutive weeks meeting freqTarget (including current if met)
 *   best              — longest such streak of weeks
 *   loggedToday       — whether today has a log
 *   isPaused          — today is inside a pause range
 *   completedThisPeriod — logs so far this week
 *   targetThisPeriod  — freqTarget
 */
export function computeWeeklyHabit(logDates, pauseRanges, freqTarget, today = todayDate()) {
  const logSet = new Set(logDates ?? []);
  const loggedToday = logSet.has(today);
  const isPaused = isPausedDay(today, pauseRanges ?? []);
  const currentWeek = weekNumber(today);

  // Group logs by week number
  const logsByWeek = new Map();
  for (const d of logDates ?? []) {
    const wk = weekNumber(d);
    if (!logsByWeek.has(wk)) logsByWeek.set(wk, 0);
    logsByWeek.set(wk, logsByWeek.get(wk) + 1);
  }

  const completedThisPeriod = logsByWeek.get(currentWeek) ?? 0;

  // Check if a week is "fully paused" (every day in range is paused)
  function isWeekFullyPaused(wk) {
    const epochMs = Date.UTC(2000, 0, 2);
    const weekStartMs = epochMs + wk * 7 * 24 * 60 * 60 * 1000;
    for (let d = 0; d < 7; d++) {
      const dt = new Date(weekStartMs + d * 24 * 60 * 60 * 1000);
      const ds = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
      if (!isPausedDay(ds, pauseRanges ?? [])) return false;
    }
    return true;
  }

  // Walk weeks descending from current week, up to 104 weeks back
  let best = 0;
  let runLen = 0;
  let current = 0;
  let firstBreak = true;
  let currentCaptured = false;

  for (let wk = currentWeek; wk >= currentWeek - 104; wk--) {
    const logsThisWeek = logsByWeek.get(wk) ?? 0;
    const met = logsThisWeek >= freqTarget || isWeekFullyPaused(wk);
    if (met) {
      runLen++;
    } else {
      if (firstBreak) {
        current = runLen;
        currentCaptured = true;
        firstBreak = false;
      }
      if (runLen > best) best = runLen;
      runLen = 0;
    }
  }

  if (runLen > best) best = runLen;
  if (!currentCaptured) current = runLen;

  return { current, best, loggedToday, isPaused, completedThisPeriod, targetThisPeriod: freqTarget };
}
