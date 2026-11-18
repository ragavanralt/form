// Friends server client. Talks to the fm_ functions in supabase/form-schema.sql through Supabase's REST RPC endpoint.
// The key below is the project's public anon key (safe in the page); it can only call those functions.
export const SERVER = {
  url: 'https://qhekfoxcbpbtpzukzxxg.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWtmb3hjYnBidHB6dWt6eHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTI0MjYsImV4cCI6MjEwODAyODQyNn0.DvttZSPuHe-R28OWYW4QtQAse6UJBlr1rArxsgAbmVU',
};
const TK = 'form2:social';
const ls = { get: () => { try { return JSON.parse(localStorage.getItem(TK) || 'null'); } catch (e) { return null; } }, set: v => { try { v ? localStorage.setItem(TK, JSON.stringify(v)) : localStorage.removeItem(TK); } catch (e) {} } };

export const Social = {
  auth: ls.get(), // {token, me, code?}
  status: 'unknown', // unknown | ready | down | nosetup
  friends: [], incoming: [], outgoing: [], feed: [], inbox: null,
  get on() { return !!(this.auth && this.auth.token); },
};

async function rpc(fn, args = {}, timeout = 12000) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${SERVER.url}/rest/v1/rpc/${fn}`, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', apikey: SERVER.key, authorization: 'Bearer ' + SERVER.key }, body: JSON.stringify(args) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    if (!r.ok) {
      const msg = (j && (j.message || j.hint)) || txt;
      if (r.status === 404 || /Could not find the function|PGRST202/.test(msg)) throw { code: 'nosetup' };
      if (/bad_token/.test(msg)) { Social.auth = null; ls.set(null); throw { code: 'signed_out' }; }
      throw { code: 'server', msg };
    }
    if (j && j.ok === false) throw { code: j.error || 'server' };
    return j;
  } catch (e) { if (e && e.name === 'AbortError') throw { code: 'down' }; if (e instanceof TypeError) throw { code: 'down' }; throw e; } finally { clearTimeout(to); }
}
const call = (fn, args = {}) => rpc(fn, { p_token: Social.auth && Social.auth.token, ...args });
const device = () => { const u = navigator.userAgent; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : 'Browser'; };

export function socialErr(e) {
  return ({ nosetup: 'The friends server isn’t set up yet. Run supabase/form-schema.sql once in Supabase.', down: 'Can’t reach the friends server right now.', handle_taken: 'That username is taken.', handle_format: 'Use 3 to 20 letters, numbers or underscores.', bad_login: 'That username and code don’t match.', no_user: 'No one has that username.', self: 'That’s you.', too_soon: 'You already sent that recently. Give it a few hours.', not_friends: 'You need to be friends first.', signed_out: 'You were signed out. Sign in again.', slow_down: 'Too many requests today.' })[e && e.code] || 'Something went wrong. Try again.';
}
export async function ping() { try { await rpc('fm_ping', {}, 8000); Social.status = 'ready'; } catch (e) { Social.status = e.code === 'nosetup' ? 'nosetup' : 'down'; } return Social.status; }
export async function signup(handle, display, avatar) {
  const r = await rpc('fm_signup', { p_handle: handle, p_display: display, p_avatar: avatar, p_device: device() });
  Social.auth = { token: r.token, me: r.me, code: r.code }; ls.set(Social.auth); return r;
}
export async function login(handle, code) { const r = await rpc('fm_login', { p_handle: handle, p_code: code, p_device: device() }); Social.auth = { token: r.token, me: r.me }; ls.set(Social.auth); return r; }
export async function logout() { try { await call('fm_logout'); } catch (e) {} Social.auth = null; ls.set(null); Social.friends = []; Social.feed = []; Social.inbox = null; }
export async function updateMe(fields) { const r = await call('fm_update', { p_display: fields.display ?? null, p_avatar: fields.avatar ?? null, p_stats: fields.stats ?? null }); Social.auth.me = r.me; ls.set(Social.auth); return r.me; }
export async function loadFriends() { const r = await call('fm_friends_list'); Social.friends = r.friends || []; Social.incoming = r.incoming || []; Social.outgoing = r.outgoing || []; if (r.me) { Social.auth.me = r.me; ls.set(Social.auth); } return r; }
export const addFriend = h => call('fm_add_friend', { p_handle: h });
export const respond = (h, yes) => call('fm_respond', { p_handle: h, p_accept: yes });
export async function loadFeed(before) { const r = await call('fm_feed', { p_before: before || null, p_limit: 40 }); const items = r.items || []; Social.feed = before ? Social.feed.concat(items) : items; return items; }
export const post = (kind, day, ref, data) => call('fm_post', { p_kind: kind, p_day: day, p_ref: ref || '', p_data: data });
export const unpost = (kind, day, ref) => call('fm_unpost', { p_kind: kind, p_day: day, p_ref: ref || '' });
export const react = (id, emoji) => call('fm_react', { p_event: id, p_emoji: emoji });
export const nudge = (h, kind, msg) => call('fm_nudge', { p_handle: h, p_kind: kind, p_msg: msg });
export async function loadInbox() { const r = await call('fm_inbox'); Social.inbox = r; return r; }
export const inboxSeen = () => call('fm_inbox_seen');
export const deleteMe = async () => { await call('fm_delete_me'); Social.auth = null; ls.set(null); };
