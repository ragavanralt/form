-- Lifted push notifications (Supabase / Postgres). Runs after form-schema.sql. Safe to run more than once.
-- Phones register a Web Push subscription with fm_push_save. Every 10 minutes pg_cron calls the "lifted-push" Edge Function,
-- which reads what is due through fm_push_batch (guarded by a shared secret) and records what it sent with fm_push_mark.
-- The keys (VAPID key pair, cron secret) live in fm_push_keys, which only these functions can read.

create table if not exists fm_push (
  id uuid primary key default gen_random_uuid(),
  secret text not null,
  user_id uuid references fm_users(id) on delete set null,
  sub jsonb not null,
  prefs jsonb not null default '{}',
  state jsonb not null default '{}',
  tz int not null default 0,
  sent jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists fm_push_keys (k text primary key, v text not null);
alter table fm_push enable row level security;
alter table fm_push_keys enable row level security;
revoke all on fm_push, fm_push_keys from anon;

-- Register, update or (p_sub null) remove this phone. Returns its id and secret, which the phone keeps.
create or replace function fm_push_save(p_id uuid, p_secret text, p_token text, p_sub jsonb, p_prefs jsonb, p_state jsonb, p_tz int) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r fm_push; u uuid;
begin
  if coalesce(p_token, '') <> '' then select user_id into u from fm_sessions where token = p_token; end if;
  if p_id is not null then select * into r from fm_push where id = p_id and secret = p_secret; end if;
  if p_sub is null then
    if r.id is not null then delete from fm_push where id = r.id; end if;
    return jsonb_build_object('ok', true, 'off', true);
  end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or coalesce(p_sub->'keys'->>'p256dh', '') = '' or coalesce(p_sub->'keys'->>'auth', '') = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_sub');
  end if;
  if length(coalesce(p_state, '{}')::text) > 4000 or length(coalesce(p_prefs, '{}')::text) > 1000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if r.id is null then
    insert into fm_push (secret, user_id, sub, prefs, state, tz) values (encode(gen_random_bytes(18), 'hex'), u, p_sub, coalesce(p_prefs, '{}'), coalesce(p_state, '{}'), coalesce(p_tz, 0)) returning * into r;
  else
    update fm_push set user_id = coalesce(u, user_id), sub = p_sub, prefs = coalesce(p_prefs, prefs), state = coalesce(p_state, state), tz = coalesce(p_tz, tz), updated_at = now() where id = r.id returning * into r;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'secret', r.secret);
end $$;

-- Everything the sender needs, in one call. Only works with the cron secret.
create or replace function fm_push_batch(p_secret text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_secret is null or p_secret is distinct from (select v from fm_push_keys where k = 'cron') then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  return jsonb_build_object('ok', true,
    'keys', (select jsonb_object_agg(k, v) from fm_push_keys where k in ('public', 'private', 'subject')),
    'devices', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'sub', p.sub, 'prefs', p.prefs, 'state', p.state, 'tz', p.tz, 'sent', p.sent,
      'me', case when u.id is null then null else jsonb_build_object('handle', u.handle, 'display', u.display, 'stats', u.stats) end,
      'partner', (select jsonb_build_object('handle', q.handle, 'display', q.display, 'stats', q.stats) from fm_users q where u.id is not null and q.handle = u.stats->>'duo' and fm_are_friends(u.id, q.id)),
      'nudges', case when u.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'msg', n.msg, 'at', n.created_at, 'from', f.display) order by n.id)
        from fm_nudges n join fm_users f on f.id = n.from_id where n.to_id = u.id and n.created_at > coalesce((p.sent->>'ev')::timestamptz, p.created_at)), '[]') end,
      'reactions', case when u.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('emoji', r.emoji, 'at', r.created_at, 'from', f.display, 'kind', e.kind) order by r.created_at)
        from fm_reactions r join fm_events e on e.id = r.event_id join fm_users f on f.id = r.user_id where e.user_id = u.id and r.user_id <> u.id and r.created_at > coalesce((p.sent->>'ev')::timestamptz, p.created_at)), '[]') end
    )) from fm_push p left join fm_users u on u.id = p.user_id), '[]'));
end $$;

-- Record what was sent (so nothing repeats), or drop a phone whose subscription is gone.
create or replace function fm_push_mark(p_secret text, p_id uuid, p_sent jsonb, p_gone boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_secret is null or p_secret is distinct from (select v from fm_push_keys where k = 'cron') then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_gone then delete from fm_push where id = p_id; else update fm_push set sent = coalesce(p_sent, sent) where id = p_id; end if;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function fm_push_save(uuid, text, text, jsonb, jsonb, jsonb, int), fm_push_batch(text), fm_push_mark(text, uuid, jsonb, boolean) to anon;
