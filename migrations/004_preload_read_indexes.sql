-- Index the manifest `preload` read, which the hub runs server-side while
-- rendering this app's document — on every launch, for every household.
--
-- preload.habits reads the live habits (archived_at IS NULL) in created order.
-- Archived habits are never dropped, so the scan grew with everything the
-- household had ever tried and then retired. Leading on archived_at turns the
-- filter into a seek and the created_at ordering comes free from the index.
CREATE INDEX IF NOT EXISTS app_habits__habits_archived_created_idx
  ON app_habits__habits (archived_at, created_at);

-- preload.logs and preload.pauses both filter on a rolling 399-day window and
-- had no index that could serve it: every existing index on these tables leads
-- with habit_id, which a bare `logged_date >= ?` range cannot use. So the app
-- read every log row ever written on every launch — and logs grow one row per
-- habit per day, making this the fastest-growing table in the app.
--
-- logged_date and end_date/start_date are all declared in db_plaintext_columns,
-- so a date range over them compares real dates rather than ciphertext.
--
-- On logs the index serves both the range and the ORDER BY. On pauses it can
-- only serve the range: the ordering is by start_date while the filter is a
-- range on end_date, and an index cannot order by a later column once an
-- earlier one is scanned as a range. Pauses are rare, so the residual sort is
-- over a handful of rows.
CREATE INDEX IF NOT EXISTS app_habits__logs_logged_date_idx
  ON app_habits__logs (logged_date);
CREATE INDEX IF NOT EXISTS app_habits__pauses_end_start_idx
  ON app_habits__pauses (end_date, start_date);
