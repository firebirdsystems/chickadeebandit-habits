DELETE FROM app_habits__logs
WHERE habit_id   = $1
  AND logged_date = COALESCE($2, DATE('now'))