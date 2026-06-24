INSERT INTO app_habits__logs (
  id,
  habit_id,
  logged_by,
  logged_date,
  note,
  created_at
) VALUES (
  lower(hex(randomblob(16))),
  $1,
  $3,
  COALESCE($2, DATE('now')),
  '',
  datetime('now')
)
ON CONFLICT (habit_id, logged_date) DO NOTHING