-- Check for triggers on projets table
SELECT
  trigger_name,
  event_manipulation as event,
  action_statement as action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'projets'
ORDER BY trigger_name;
