SELECT
  h.id,
  h.owner_id,
  h.title,
  h.emoji,
  h.visibility,
  h.is_group,
  h.frequency,
  h.freq_target,
  h.grace_days,
  h.created_at,
  COUNT(l.id)          AS total_logs,
  MAX(l.logged_date)   AS last_logged_date
FROM app_habits__habits h
LEFT JOIN app_habits__logs l
  ON l.habit_id       = h.id
WHERE h.archived_at   IS NULL
  AND h.visibility    IN ('adults', 'everyone')
GROUP BY h.id, h.owner_id, h.title, h.emoji, h.visibility, h.is_group,
         h.frequency, h.freq_target, h.grace_days, h.created_at
ORDER BY (last_logged_date IS NULL), last_logged_date DESC, h.title
LIMIT 100