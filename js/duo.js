// Duo streak: you and one friend both keep the day alive (45+). Shared through the stats each of you already syncs:
// `hold` is a string of the last 60 days ending on `day`, 1 where the day counted. Pure.
import { addDays, dayDiff, todayK, score, HOLD } from './core.js';

export const HOLD_DAYS = 60;
export function holdString(S, today = todayK()) {
  let s = ''; for (let i = HOLD_DAYS - 1; i >= 0; i--) { const k = addDays(today, -i); s += k >= (S.profile.start || k) && score(S, k).total >= HOLD ? '1' : '0'; }
  return s;
}
// bit for day k from a hold string that ends on `end`
const bit = (str, end, k) => { const i = str.length - 1 - dayDiff(k, end); return i >= 0 && i < str.length ? str[i] === '1' : false; };

// { n, me, them, both } — n counts back from today; today only adds once both have done it, and never breaks it.
export function duoStreak(mine, theirs, today = todayK()) {
  if (!theirs || !theirs.hold || !theirs.day) return { n: 0, me: mine[mine.length - 1] === '1', them: false };
  const me = bit(mine, today, today), them = theirs.day === today && bit(theirs.hold, theirs.day, today);
  let n = me && them ? 1 : 0;
  for (let k = addDays(today, -1), g = 0; g < HOLD_DAYS; k = addDays(k, -1), g++) { if (bit(mine, today, k) && bit(theirs.hold, theirs.day, k)) n++; else break; }
  return { n, me, them };
}
