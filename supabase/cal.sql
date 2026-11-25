-- Built calendar feed: your log (workouts, daily score and food, planned workouts) as a calendar you subscribe to.
-- The phone builds the events and saves them under a random token; the lifted-push function serves them at ?cal=<token>.
-- Run once in Supabase → SQL Editor. Safe to run more than once.

create table if not exists fm_cal (
  token text primary key check (token ~ '^[a-f0-9]{32}$'),
  events jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table fm_cal enable row level security;
revoke all on fm_cal from anon;

-- Save (or with p_events null, delete) the feed for this token.
create or replace function fm_cal_save(p_token text, p_events jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if coalesce(p_token, '') !~ '^[a-f0-9]{32}$' then return jsonb_build_object('ok', false, 'error', 'bad_token'); end if;
  if p_events is null then delete from fm_cal where token = p_token; return jsonb_build_object('ok', true, 'off', true); end if;
  if jsonb_typeof(p_events) <> 'array' or length(p_events::text) > 400000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  insert into fm_cal (token, events) values (p_token, p_events)
    on conflict (token) do update set events = excluded.events, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- The feed, for the function to turn into a calendar file. Null if there is none.
create or replace function fm_cal_get(p_token text) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select events from fm_cal where token = p_token
$$;

grant execute on function fm_cal_save(text, jsonb), fm_cal_get(text) to anon;
