CREATE TABLE IF NOT EXISTS app_habits__habits (
  id           TEXT    NOT NULL PRIMARY KEY,
  owner_id     TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  emoji        TEXT    NOT NULL DEFAULT '✅',
  why          TEXT    NOT NULL DEFAULT '',
  visibility   TEXT    NOT NULL DEFAULT 'private',
  is_group     INTEGER NOT NULL DEFAULT 0,
  frequency    TEXT    NOT NULL DEFAULT 'daily',
  freq_target  INTEGER NOT NULL DEFAULT 1,
  grace_days   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL,
  archived_at  TEXT
);

CREATE INDEX IF NOT EXISTS habits_owner_vis_idx ON app_habits__habits (owner_id, visibility);

CREATE TABLE IF NOT EXISTS app_habits__logs (
  id          TEXT NOT NULL PRIMARY KEY,
  habit_id    TEXT NOT NULL,
  logged_by   TEXT NOT NULL,
  logged_date TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_unique_day ON app_habits__logs (habit_id, logged_date);

CREATE INDEX IF NOT EXISTS habit_logs_habit_date_idx ON app_habits__logs (habit_id, logged_date);

CREATE TABLE IF NOT EXISTS app_habits__pauses (
  id         TEXT NOT NULL PRIMARY KEY,
  habit_id   TEXT NOT NULL,
  owner_id   TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS habit_pauses_idx ON app_habits__pauses (habit_id, start_date, end_date)
