# Lifted

Food, training and habits in one daily score. Every day is scored out of 100 from the things you choose to track. 70 is a win, 45 keeps your streak alive. Win days to climb levels, and race your friends in a weekly league.

Open the site on an iPhone in Safari, tap Share, then *Add to Home Screen*. It runs full screen from the home screen.

## What's in it

- **Today**: a score dial split by what you track, your streak, level and week, and a coach that ranks the next best move by how many points it's worth.
- **AI food logging**: snap a photo and the AI draws a box around each food it finds, says how it sized the portions and how confident it is, and suggests how to make the estimate more accurate. Drag a portion slider to fix a size. It can ask one follow-up question ("skin on?") and update the numbers. You can also describe a meal in words or pick from favourites and recents.
- **Training**: a weekly plan, routines, 100+ exercises with a moving drawing of each lift and coaching cues, live workouts with previous sets, progressive overload hints, PR detection, a rest timer and a weekly muscle heat map. Import any plan or log (text or screenshots) with AI.
- **Progress**: score trend, an 18-week consistency heatmap, calories and macros, body weight trend line, weekly training volume, an AI read of your week, and badges.
- **Friends** (optional): a feed of workouts, PRs, streaks and closed days, reactions, nudges/cheers/flexes, head to head with your closest rival, a weekly league, and a "while you were away" summary when you open the app.
- **The Build**: every muscle has its own level, earned from your hard sets (half credit for helper muscles). Levels never drop; muscles you skip fade on the body map until you train them again. Finishing a workout shows which muscles levelled up.
- **Daily Drop**: one small challenge a day, picked from what you actually track (beat a lift from last time, hit protein, extra steps). It's gone at midnight.
- **Ghost race**: during a workout you race your last session of the same lifts, live. On Today you race last week's you.
- **Rewards**: finishing a Drop or a week with 5+ wins earns a reward: a title for your profile, an avatar frame, or a streak freeze.
- **Seasons and Wrapped**: 6-week seasons on a shared calendar, a tier from your wins (Bronze to Diamond), and a story-style Wrapped at the end with a shareable image.
- **Duo streak**: pick one friend; the streak only grows on days you both keep alive.
- **Notifications**: a morning plan with today's drop, a training-day reminder, an evening heads-up when your streak is at risk, and friend nudges. Times and kinds are up to you.
- **Fully customizable**: turn nutrition, training, cardio, steps, water, supplements and body weight on or off. The score rebalances to 100 for whatever you keep. Settings → Features switches every extra above (and streaks, levels, badges, confetti, the Friends tab) on or off.

## Privacy

- Your log lives on your device (browser storage). Back it up from Settings → Back up.
- AI uses your own free Gemini key, stored only on your device.
- Friends see only day scores, streaks and workouts, and only if you sign up. Meals, photos and weight are never shared.

## Friends server (one-time setup)

The friends features run on Supabase. The app is already pointed at the project in `js/social.js`. To switch them on, open that project in Supabase, go to **SQL Editor**, paste all of `supabase/form-schema.sql` and press **Run**. It only creates tables and functions whose names start with `fm_`, so it doesn't touch anything else in the project, and it's safe to run again. Until then the Friends tab says the server isn't set up and everything else works.

## Notifications server (one-time setup)

Phone notifications need two things in the same Supabase project, after the friends setup:

1. **SQL Editor**: paste all of `supabase/push-setup.local.sql` and press **Run**. That file is made for you locally and is not in git, because it holds your private signing key. (Without it, run `supabase/push.sql`, then add your own keys to `fm_push_keys` and schedule the cron job the same way.) It creates the `fm_push` tables and functions and a pg_cron job that runs every 10 minutes.
2. **Edge Functions → Deploy a new function → Via editor**: name it `lifted-push`, paste all of `supabase/functions/lifted-push/index.ts`, and deploy.

Then on the phone: open Lifted from the Home Screen, Settings → Notifications → Turn on notifications. On iPhone this needs iOS 16.4 or later, and only works from the Home Screen app.

## Coming from the old Form

The previous version is kept at `classic/`. On first open, Form offers to bring in the old data from this device (days, meals, workouts, routines, weekly plan, favourites, creatine). You can also do it later from Settings → Restore or import, which also reads Form Classic export files.

## Development

No build step. Serve the folder (`npm start`, then open http://localhost:8080) and edit the files in `js/` and `css/`.

- `npm test` runs the logic tests, the notification sender tests and the friends/notification server tests. `test/draw.html` shows every exercise drawing (`?anim` to animate). The server tests need PGlite: `npm i --no-save @electric-sql/pglite@0.4.6`. Without it they skip.

## Credits

- Avatars: “Thumbs” by DiceBear (CC0 1.0), recoloured, in assets/avatars. The default avatar is your initial on a gradient.
- Muscle maps: polygon data adapted from react-body-highlighter by GV79 (MIT).
