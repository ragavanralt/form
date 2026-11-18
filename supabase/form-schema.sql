-- Form social server (Supabase / Postgres). Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once. Every table name starts with fm_ so it can share a project with other apps.
-- The page only ever holds the public anon key. Tables have row level security with no policies, so the anon key
-- can't read or write them directly; it can only call the fm_ functions below, which check a session token.

create extension if not exists pgcrypto with schema extensions;

create table if not exists fm_users (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display text not null default '',
  avatar jsonb not null default '{}',
  code_hash text not null,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  inbox_seen timestamptz not null default now()
);
create table if not exists fm_sessions (token text primary key, user_id uuid not null references fm_users(id) on delete cascade, device text, created_at timestamptz not null default now());
create table if not exists fm_friends (a uuid not null references fm_users(id) on delete cascade, b uuid not null references fm_users(id) on delete cascade, status text not null default 'pending', created_at timestamptz not null default now(), primary key (a, b));
create table if not exists fm_events (id bigserial primary key, user_id uuid not null references fm_users(id) on delete cascade, kind text not null, day date not null, ref text not null default '', data jsonb not null default '{}', created_at timestamptz not null default now(), unique (user_id, kind, day, ref));
create index if not exists fm_events_user_time on fm_events (user_id, id desc);
create table if not exists fm_reactions (event_id bigint not null references fm_events(id) on delete cascade, user_id uuid not null references fm_users(id) on delete cascade, emoji text not null, created_at timestamptz not null default now(), primary key (event_id, user_id));
create table if not exists fm_nudges (id bigserial primary key, from_id uuid not null references fm_users(id) on delete cascade, to_id uuid not null references fm_users(id) on delete cascade, kind text not null, msg text not null default '', created_at timestamptz not null default now());
create index if not exists fm_nudges_to on fm_nudges (to_id, id desc);

alter table fm_users enable row level security;
alter table fm_sessions enable row level security;
alter table fm_friends enable row level security;
alter table fm_events enable row level security;
alter table fm_reactions enable row level security;
alter table fm_nudges enable row level security;

create or replace function fm_uid(p_token text) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare u uuid;
begin
  select user_id into u from fm_sessions where token = p_token;
  if u is null then raise exception 'bad_token'; end if;
  update fm_users set last_seen = now() where id = u and last_seen < now() - interval '2 minutes';
  return u;
end $$;

create or replace function fm_card(u fm_users) returns jsonb language sql stable as $$
  select jsonb_build_object('id', u.id, 'handle', u.handle, 'display', u.display, 'avatar', u.avatar, 'stats', u.stats, 'last_seen', u.last_seen)
$$;

create or replace function fm_ping() returns jsonb language sql security definer as $$ select jsonb_build_object('ok', true, 'v', 1) $$;

create or replace function fm_signup(p_handle text, p_display text, p_avatar jsonb, p_device text default '') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h text := lower(trim(p_handle)); c text; tok text; u fm_users;
begin
  if h !~ '^[a-z0-9_]{3,20}$' then return jsonb_build_object('ok', false, 'error', 'handle_format'); end if;
  if exists (select 1 from fm_users where handle = h) then return jsonb_build_object('ok', false, 'error', 'handle_taken'); end if;
  c := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  insert into fm_users (handle, display, avatar, code_hash) values (h, left(coalesce(p_display, ''), 40), coalesce(p_avatar, '{}'), crypt(c, gen_salt('bf'))) returning * into u;
  tok := encode(gen_random_bytes(24), 'hex');
  insert into fm_sessions (token, user_id, device) values (tok, u.id, left(p_device, 60));
  return jsonb_build_object('ok', true, 'token', tok, 'code', c, 'me', fm_card(u));
end $$;

create or replace function fm_login(p_handle text, p_code text, p_device text default '') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u fm_users; tok text;
begin
  select * into u from fm_users where handle = lower(trim(p_handle));
  if u.id is null or u.code_hash <> crypt(upper(trim(p_code)), u.code_hash) then
    perform pg_sleep(0.6); return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  tok := encode(gen_random_bytes(24), 'hex');
  insert into fm_sessions (token, user_id, device) values (tok, u.id, left(p_device, 60));
  return jsonb_build_object('ok', true, 'token', tok, 'me', fm_card(u));
end $$;

create or replace function fm_logout(p_token text) returns jsonb language sql security definer as $$
  delete from fm_sessions where token = p_token; select jsonb_build_object('ok', true)
$$;

create or replace function fm_update(p_token text, p_display text default null, p_avatar jsonb default null, p_stats jsonb default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); u fm_users;
begin
  update fm_users set display = coalesce(left(p_display, 40), display), avatar = coalesce(p_avatar, avatar), stats = coalesce(p_stats, stats)
  where id = me returning * into u;
  return jsonb_build_object('ok', true, 'me', fm_card(u));
end $$;

create or replace function fm_are_friends(x uuid, y uuid) returns boolean language sql stable as $$
  select exists (select 1 from fm_friends where status = 'accepted' and ((a = x and b = y) or (a = y and b = x)))
$$;

create or replace function fm_add_friend(p_token text, p_handle text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); other uuid;
begin
  select id into other from fm_users where handle = lower(trim(p_handle));
  if other is null then return jsonb_build_object('ok', false, 'error', 'no_user'); end if;
  if other = me then return jsonb_build_object('ok', false, 'error', 'self'); end if;
  if fm_are_friends(me, other) then return jsonb_build_object('ok', true, 'status', 'accepted'); end if;
  if exists (select 1 from fm_friends where a = other and b = me) then
    update fm_friends set status = 'accepted' where a = other and b = me;
    return jsonb_build_object('ok', true, 'status', 'accepted');
  end if;
  if (select count(*) from fm_friends where a = me and status = 'pending' and created_at > now() - interval '1 day') > 30 then
    return jsonb_build_object('ok', false, 'error', 'slow_down');
  end if;
  insert into fm_friends (a, b) values (me, other) on conflict do nothing;
  return jsonb_build_object('ok', true, 'status', 'pending');
end $$;

create or replace function fm_respond(p_token text, p_handle text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); other uuid;
begin
  select id into other from fm_users where handle = lower(trim(p_handle));
  if p_accept then update fm_friends set status = 'accepted' where a = other and b = me;
  else delete from fm_friends where (a = other and b = me) or (a = me and b = other); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function fm_friends_list(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token);
begin
  return jsonb_build_object('ok', true,
    'me', (select fm_card(u) from fm_users u where u.id = me),
    'friends', coalesce((select jsonb_agg(fm_card(u) order by u.display) from fm_users u where fm_are_friends(me, u.id)), '[]'),
    'incoming', coalesce((select jsonb_agg(fm_card(u)) from fm_friends f join fm_users u on u.id = f.a where f.b = me and f.status = 'pending'), '[]'),
    'outgoing', coalesce((select jsonb_agg(fm_card(u)) from fm_friends f join fm_users u on u.id = f.b where f.a = me and f.status = 'pending'), '[]'));
end $$;

create or replace function fm_post(p_token text, p_kind text, p_day date, p_ref text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); eid bigint;
begin
  if p_kind not in ('workout', 'pr', 'day', 'streak', 'level', 'badge', 'weight', 'meal') then return jsonb_build_object('ok', false, 'error', 'kind'); end if;
  if length(p_data::text) > 4000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  insert into fm_events (user_id, kind, day, ref, data) values (me, p_kind, p_day, left(coalesce(p_ref, ''), 60), p_data)
  on conflict (user_id, kind, day, ref) do update set data = excluded.data
  returning id into eid;
  return jsonb_build_object('ok', true, 'id', eid);
end $$;

create or replace function fm_unpost(p_token text, p_kind text, p_day date, p_ref text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token);
begin
  delete from fm_events where user_id = me and kind = p_kind and day = p_day and ref = coalesce(p_ref, '');
  return jsonb_build_object('ok', true);
end $$;

create or replace function fm_feed(p_token text, p_before bigint default null, p_limit int default 40) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token);
begin
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(x order by (x->>'id')::bigint desc) from (
      select jsonb_build_object('id', e.id, 'kind', e.kind, 'day', e.day, 'data', e.data, 'at', e.created_at, 'user', fm_card(u),
        'mine', e.user_id = me,
        'reactions', coalesce((select jsonb_object_agg(emoji, n) from (select emoji, count(*) n from fm_reactions r where r.event_id = e.id group by emoji) q), '{}'),
        'my', (select emoji from fm_reactions r where r.event_id = e.id and r.user_id = me),
        'by', coalesce((select jsonb_agg(uu.display) from fm_reactions r join fm_users uu on uu.id = r.user_id where r.event_id = e.id), '[]')) x
      from fm_events e join fm_users u on u.id = e.user_id
      where (e.user_id = me or fm_are_friends(me, e.user_id)) and (p_before is null or e.id < p_before)
      order by e.id desc limit least(greatest(p_limit, 1), 80)) s), '[]'));
end $$;

create or replace function fm_react(p_token text, p_event bigint, p_emoji text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); owner uuid; cur text;
begin
  select user_id into owner from fm_events where id = p_event;
  if owner is null or not (owner = me or fm_are_friends(me, owner)) then return jsonb_build_object('ok', false, 'error', 'no_event'); end if;
  select emoji into cur from fm_reactions where event_id = p_event and user_id = me;
  if cur = p_emoji then delete from fm_reactions where event_id = p_event and user_id = me;
  else insert into fm_reactions (event_id, user_id, emoji) values (p_event, me, left(p_emoji, 8)) on conflict (event_id, user_id) do update set emoji = excluded.emoji, created_at = now(); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function fm_nudge(p_token text, p_handle text, p_kind text, p_msg text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); other uuid;
begin
  select id into other from fm_users where handle = lower(trim(p_handle));
  if other is null or not fm_are_friends(me, other) then return jsonb_build_object('ok', false, 'error', 'not_friends'); end if;
  if p_kind not in ('nudge', 'flex', 'cheer', 'challenge') then return jsonb_build_object('ok', false, 'error', 'kind'); end if;
  if exists (select 1 from fm_nudges where from_id = me and to_id = other and kind = p_kind and created_at > now() - interval '3 hours') then
    return jsonb_build_object('ok', false, 'error', 'too_soon');
  end if;
  insert into fm_nudges (from_id, to_id, kind, msg) values (me, other, p_kind, left(coalesce(p_msg, ''), 140));
  return jsonb_build_object('ok', true);
end $$;

create or replace function fm_inbox(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token); since timestamptz;
begin
  select inbox_seen into since from fm_users where id = me;
  return jsonb_build_object('ok', true, 'since', since,
    'nudges', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'msg', n.msg, 'at', n.created_at, 'from', fm_card(u), 'new', n.created_at > since) order by n.id desc)
      from (select * from fm_nudges where to_id = me order by id desc limit 30) n join fm_users u on u.id = n.from_id), '[]'),
    'reactions', coalesce((select jsonb_agg(jsonb_build_object('emoji', r.emoji, 'at', r.created_at, 'kind', e.kind, 'data', e.data, 'from', fm_card(u), 'new', r.created_at > since) order by r.created_at desc)
      from (select r.* from fm_reactions r join fm_events e2 on e2.id = r.event_id where e2.user_id = me and r.user_id <> me order by r.created_at desc limit 30) r
      join fm_events e on e.id = r.event_id join fm_users u on u.id = r.user_id), '[]'),
    'requests', coalesce((select jsonb_agg(fm_card(u)) from fm_friends f join fm_users u on u.id = f.a where f.b = me and f.status = 'pending'), '[]'));
end $$;

create or replace function fm_inbox_seen(p_token text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token);
begin update fm_users set inbox_seen = now() where id = me; return jsonb_build_object('ok', true); end $$;

create or replace function fm_delete_me(p_token text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := fm_uid(p_token);
begin delete from fm_users where id = me; return jsonb_build_object('ok', true); end $$;

revoke all on fm_users, fm_sessions, fm_friends, fm_events, fm_reactions, fm_nudges from anon;
grant execute on function fm_ping(), fm_signup(text, text, jsonb, text), fm_login(text, text, text), fm_logout(text), fm_update(text, text, jsonb, jsonb),
  fm_add_friend(text, text), fm_respond(text, text, boolean), fm_friends_list(text), fm_post(text, text, date, text, jsonb), fm_unpost(text, text, date, text),
  fm_feed(text, bigint, int), fm_react(text, bigint, text), fm_nudge(text, text, text, text), fm_inbox(text), fm_inbox_seen(text), fm_delete_me(text) to anon;
revoke execute on function fm_uid(text) from anon, public;
