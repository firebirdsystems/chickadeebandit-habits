SELECT
  l.habit_id,
  l.logged_by,
  l.logged_date,
  h.title,
  h.emoji
FROM app_habits__logs l
JOIN app_habits__habits h ON h.id = l.habit_id
WHERE l.logged_date = :today
  AND h.archived_at IS NULL
ORDER BY l.created_at DESC