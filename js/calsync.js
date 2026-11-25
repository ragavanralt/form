// Keeps your calendar feed on the server up to date. Turned on in Settings → Calendar.
// The token is the feed's private address: anyone with the link can read the calendar, so it is random and long.
import { S, save } from './store.js';
import { calEvents } from './cal.js';
import { rpc, SERVER } from './social.js';

const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
export const calOn = () => !!(S.settings.cal && S.settings.cal.token);
export const calFeed = (scheme = 'webcal') => `${scheme === 'webcal' ? 'webcal' : 'https'}://${SERVER.url.replace(/^https?:\/\//, '')}/functions/v1/lifted-push?cal=${S.settings.cal.token}`;

let last = '', timer = null;
async function upload() {
  const ev = calEvents(S), sig = JSON.stringify(ev);
  if (sig === last) return;
  const r = await rpc('fm_cal_save', { p_token: S.settings.cal.token, p_events: ev });
  if (r && r.ok === false) throw { code: r.error || 'fail' };
  last = sig;
}
export async function calEnable() {
  S.settings.cal = { token: newToken() }; save();
  try { await upload(); } catch (e) { S.settings.cal = null; save(); throw e; }
}
export async function calDisable() {
  const t = S.settings.cal && S.settings.cal.token;
  S.settings.cal = null; save(); last = '';
  if (t) { try { await rpc('fm_cal_save', { p_token: t, p_events: null }); } catch (e) {} }
}
// After anything is logged: upload again a little later (only if something in the calendar changed).
export function calSync(delay = 15000) {
  if (!calOn()) return;
  clearTimeout(timer);
  timer = setTimeout(() => { upload().catch(() => {}); }, delay);
}
