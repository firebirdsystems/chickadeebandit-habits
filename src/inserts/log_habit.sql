INSERT INTO app_habits__logs (
  id,
  habit_id,
  logged_date,
  logged_by,
  note,
  created_at
) VALUES (
  lower(hex(randomblob(16))),
  $1,
  COALESCE($2, :today),
  $3,
  '',
  datetime('now')
)
ON CONFLICT (habit_id, logged_date) DO NOTHING
