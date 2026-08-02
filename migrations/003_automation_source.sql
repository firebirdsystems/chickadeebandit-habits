-- Automation support for the `start_habit` action.
--
-- `source_event_id` records which app event produced the row. The dispatcher's
-- dedupe guard matches on it (SELECT 1 FROM ... WHERE source_event_id = ?
-- LIMIT 1), so a retried or replayed delivery finds the existing row and skips
-- instead of starting a second copy of the same habit.
--
-- Nullable on purpose: habits a member creates in the UI have no source event,
-- and the guard only ever looks for a specific non-null id.
ALTER TABLE app_habits__habits ADD COLUMN source_event_id TEXT;

CREATE INDEX IF NOT EXISTS app_habits__idx_habits_source_event_id
  ON app_habits__habits(source_event_id);
