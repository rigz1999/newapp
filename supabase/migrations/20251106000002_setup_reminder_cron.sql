-- ============================================
-- Setup Cron Job for Coupon Reminders
-- Path: supabase/migrations/20251106000002_setup_reminder_cron.sql
-- ============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the send-coupon-reminders function to run every day at 7:00 AM
-- The cron expression '0 7 * * *' means: minute=0, hour=7, any day, any month, any day of week
SELECT cron.schedule(
  'send-daily-coupon-reminders',  -- Job name
  '0 7 * * *',                     -- Cron expression: Every day at 7:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/send-coupon-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To manually unschedule (if needed later):
-- SELECT cron.unschedule('send-daily-coupon-reminders');
