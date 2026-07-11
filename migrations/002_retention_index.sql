CREATE INDEX IF NOT EXISTS app_habits__logs_retention_idx
  ON app_habits__logs (created_at, id);
