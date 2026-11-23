-- Lifted push schedule. Run once in Supabase → SQL Editor, after push.sql. Safe to run again (it replaces the job).
-- Every 10 minutes, call the lifted-push Edge Function with the cron secret, read from fm_push_keys at run time.
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('lifted-push', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://qhekfoxcbpbtpzukzxxg.supabase.co/functions/v1/lifted-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select v from public.fm_push_keys where k = 'cron')),
    body := '{}'::jsonb
  );
$job$);
