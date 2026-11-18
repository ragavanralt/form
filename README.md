# Lifted

Food, training and habits in one daily score. Every day is scored out of 100 from the things you choose to track. 70 is a win, 45 keeps your streak alive. Win days to climb levels, and race your friends in a weekly league.

Open the site on an iPhone in Safari, tap Share, then *Add to Home Screen*. It runs full screen from the home screen.

## What's in it

- **Today**: a score dial split by what you track, your streak, level and week, and a coach that ranks the next best move by how many points it's worth.
- **AI food logging**: snap a photo and the AI draws a box around each food it finds, says how it sized the portions and how confident it is, and suggests how to make the estimate more accurate. Drag a portion slider to fix a size. It can ask one follow-up question ("skin on?") and update the numbers. You can also describe a meal in words or pick from favourites and recents.
- **Training**: a weekly plan, routines, 100+ exercises with muscle diagrams and coaching cues, live workouts with previous sets, progressive overload hints, PR detection, a rest timer and a weekly muscle heat map. Import any plan or log (text or screenshots) with AI.
- **Progress**: score trend, an 18-week consistency heatmap, calories and macros, body weight trend line, weekly training volume, an AI read of your week, and badges.
- **Friends** (optional): a feed of workouts, PRs, streaks and closed days, reactions, nudges/cheers/flexes, head to head with your closest rival, a weekly league, and a "while you were away" summary when you open the app.
- **Fully customizable**: turn nutrition, training, cardio, steps, water, supplements and body weight on or off. The score rebalances to 100 for whatever you keep.

## Privacy

- Your log lives on your device (browser storage). Back it up from Settings → Back up.
- AI uses your own free Gemini key, stored only on your device.
- Friends see only day scores, streaks and workouts, and only if you sign up. Meals, photos and weight are never shared.

## Friends server (one-time setup)

The friends features run on Supabase. The app is already pointed at the project in `js/social.js`. To switch them on, open that project in Supabase, go to **SQL Editor**, paste all of `supabase/form-schema.sql` and press **Run**. It only creates tables and functions whose names start with `fm_`, so it doesn't touch anything else in the project, and it's safe to run again. Until then the Friends tab says the server isn't set up and everything else works.

## Coming from the old Form

The previous version is kept at `classic/`. On first open, Form offers to bring in the old data from this device (days, meals, workouts, routines, weekly plan, favourites, creatine). You can also do it later from Settings → Restore or import, which also reads Form Classic export files.

## Development

No build step. Serve the folder (`npm start`, then open http://localhost:8080) and edit the files in `js/` and `css/`.

- `npm test` runs the logic tests and the friends server tests. The server tests need PGlite: `npm i --no-save @electric-sql/pglite@0.4.6`. Without it they skip.

## Credits

- Avatars: “Thumbs” by DiceBear (CC0 1.0), recoloured, in assets/avatars. The default avatar is your initial on a gradient.
- Muscle maps: polygon data adapted from react-body-highlighter by GV79 (MIT).
