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

-- "Send a test notification" from Settings: checks the phone's own secret, then asks the function to push to just that phone.
create or replace function fm_push_test(p_id uuid, p_secret text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r fm_push;
begin
  select * into r from fm_push where id = p_id and secret = p_secret;
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if (r.sent->>'test') is not null and (r.sent->>'test')::timestamptz > now() - interval '30 seconds' then return jsonb_build_object('ok', false, 'error', 'too_soon'); end if;
  update fm_push set sent = sent || jsonb_build_object('test', now()) where id = r.id;
  perform net.http_post(
    url := 'https://qhekfoxcbpbtpzukzxxg.supabase.co/functions/v1/lifted-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select v from public.fm_push_keys where k = 'cron')),
    body := jsonb_build_object('only', r.id, 'test', true));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function fm_push_test(uuid, text) to anon;
