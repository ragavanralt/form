// Exercise library: name, primary muscles, secondary muscles, equipment, coaching cue.
// Muscle ids match the body map regions in body.js.
export const MUSCLES = {
  chest: 'Chest', delts: 'Shoulders', rdelt: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', traps: 'Traps', lats: 'Lats', upper: 'Upper back', lower: 'Lower back',
  glutes: 'Glutes', quads: 'Quads', hams: 'Hamstrings', calves: 'Calves', adductors: 'Adductors',
};
export const GROUPS = {
  Chest: ['chest'], Back: ['lats', 'upper', 'lower', 'traps'], Shoulders: ['delts', 'rdelt'], Arms: ['biceps', 'triceps', 'forearms'],
  Legs: ['quads', 'hams', 'glutes', 'calves', 'adductors'], Core: ['abs', 'obliques'],
};
export const groupOf = m => Object.keys(GROUPS).find(g => GROUPS[g].includes(m)) || 'Other';
export const EQUIP = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith', 'Kettlebell', 'Band'];

const R = (n, p, s, e, c) => ({ n, p: p.split(' '), s: s ? s.split(' ') : [], e, c });
export const EXERCISES = [
  // chest
  R('Barbell Bench Press', 'chest', 'triceps delts', 'Barbell', 'Shoulder blades pinned, bar to lower chest, press up and slightly back.'),
  R('Incline Barbell Press', 'chest', 'delts triceps', 'Barbell', 'Bench at 30°. Touch the upper chest, elbows about 45° from the body.'),
  R('Flat Dumbbell Press', 'chest', 'triceps delts', 'Dumbbell', 'Lower until you feel a deep stretch, then drive the dumbbells together.'),
  R('Incline Dumbbell Press', 'chest', 'delts triceps', 'Dumbbell', 'Low incline, elbows tucked a little, control the bottom.'),
  R('Machine Chest Press', 'chest', 'triceps delts', 'Machine', 'Seat so handles line up mid-chest. Full stretch, no lockout bounce.'),
  R('Smith Incline Press', 'chest', 'delts triceps', 'Smith', 'Bench under the bar path so it lands on the upper chest.'),
  R('Pec Deck', 'chest', 'delts', 'Machine', 'Slight elbow bend, squeeze hands together, slow on the way back.'),
  R('Cable Fly', 'chest', 'delts', 'Cable', 'Step forward, hug a big tree, keep the elbow angle fixed.'),
  R('Low-to-High Cable Fly', 'chest', 'delts', 'Cable', 'Cables low, sweep up to eye level to hit the upper chest.'),
  R('Dips', 'chest', 'triceps delts', 'Bodyweight', 'Lean forward for chest, go to a comfortable stretch, press up.'),
  R('Push-Up', 'chest', 'triceps delts abs', 'Bodyweight', 'Body in one line, chest to the floor, elbows at 45°.'),
  R('Decline Bench Press', 'chest', 'triceps', 'Barbell', 'Bar to the lower chest, keep the shoulders packed.'),
  R('Dumbbell Pullover', 'chest', 'lats triceps', 'Dumbbell', 'Arms nearly straight, lower behind the head until the ribs stretch.'),
  // back
  R('Pull-Up', 'lats', 'biceps upper', 'Bodyweight', 'Dead hang, drive elbows down to the ribs, chin over the bar.'),
  R('Chin-Up', 'lats', 'biceps', 'Bodyweight', 'Palms facing you, pull the chest to the bar.'),
  R('Lat Pulldown', 'lats', 'biceps upper', 'Cable', 'Lean back slightly, pull elbows to hips, chest up.'),
  R('Neutral-Grip Pulldown', 'lats', 'biceps', 'Cable', 'Close neutral handle, pull to the upper chest, full stretch at the top.'),
  R('Straight-Arm Pulldown', 'lats', 'triceps', 'Cable', 'Arms long, sweep the bar to the thighs using only the lats.'),
  R('Seated Cable Row', 'upper', 'lats biceps rdelt', 'Cable', 'Tall chest, row to the belly, squeeze the shoulder blades.'),
  R('Chest-Supported Row', 'upper', 'lats rdelt biceps', 'Machine', 'Chest stays on the pad, drive the elbows back.'),
  R('Barbell Row', 'upper', 'lats lower biceps', 'Barbell', 'Hinge to about 45°, row to the lower ribs, no torso swing.'),
  R('Dumbbell Row', 'lats', 'upper biceps', 'Dumbbell', 'Hand and knee on the bench, pull the dumbbell to the hip.'),
  R('T-Bar Row', 'upper', 'lats biceps', 'Machine', 'Hips back, flat back, pull the handles to the chest.'),
  R('Single-Arm Cable Row', 'lats', 'upper biceps', 'Cable', 'Reach long, then pull the elbow past the torso.'),
  R('Machine Row', 'upper', 'lats biceps', 'Machine', 'Pause each rep with the shoulder blades squeezed.'),
  R('Deadlift', 'lower', 'glutes hams traps quads', 'Barbell', 'Bar over mid-foot, brace hard, push the floor away.'),
  R('Rack Pull', 'lower', 'traps glutes', 'Barbell', 'From knee height, lock out with the hips, not the lower back.'),
  R('Back Extension', 'lower', 'glutes hams', 'Bodyweight', 'Hinge at the hips, rise to a straight line, do not overarch.'),
  R('Barbell Shrug', 'traps', 'forearms', 'Barbell', 'Shoulders straight up to the ears, pause, lower slowly.'),
  R('Dumbbell Shrug', 'traps', 'forearms', 'Dumbbell', 'Arms long, elevate and hold for a second.'),
  // shoulders
  R('Overhead Press', 'delts', 'triceps traps', 'Barbell', 'Squeeze glutes, press the bar up and slightly back over the head.'),
  R('Shoulder Press', 'delts', 'triceps', 'Dumbbell', 'Seated, lower to ear level, press without clanking at the top.'),
  R('Machine Shoulder Press', 'delts', 'triceps', 'Machine', 'Handles start at chin height, press smoothly.'),
  R('Arnold Press', 'delts', 'triceps', 'Dumbbell', 'Rotate palms out as you press.'),
  R('Dumbbell Lateral Raise', 'delts', 'traps', 'Dumbbell', 'Lead with the elbows, raise to shoulder height, no swinging.'),
  R('Cable Lateral Raise', 'delts', '', 'Cable', 'Cable from behind, sweep out to the side, constant tension.'),
  R('Machine Lateral Raise', 'delts', '', 'Machine', 'Pads on the outer arms, push out and up.'),
  R('Front Raise', 'delts', 'chest', 'Dumbbell', 'Raise to eye level with a slight bend, control down.'),
  R('Reverse Pec Deck', 'rdelt', 'upper traps', 'Machine', 'Arms long, sweep back, shoulders stay down.'),
  R('Face Pull', 'rdelt', 'traps upper', 'Cable', 'Rope to the face, pull apart, thumbs back.'),
  R('Rear Delt Fly', 'rdelt', 'upper', 'Dumbbell', 'Hinge over, raise out to the sides with soft elbows.'),
  R('Upright Row', 'delts', 'traps', 'Cable', 'Elbows lead, stop at chest height.'),
  // arms
  R('Barbell Curl', 'biceps', 'forearms', 'Barbell', 'Elbows pinned, curl without leaning back.'),
  R('Dumbbell Curl', 'biceps', 'forearms', 'Dumbbell', 'Supinate as you curl, lower over 2 seconds.'),
  R('Incline Dumbbell Curl', 'biceps', '', 'Dumbbell', 'Arms hang behind the body for a long stretch.'),
  R('Preacher Curl', 'biceps', '', 'Machine', 'Armpit on the pad, slow negative, full stretch.'),
  R('Hammer Curl', 'biceps', 'forearms', 'Dumbbell', 'Neutral grip, curl across or straight up.'),
  R('Cable Curl', 'biceps', '', 'Cable', 'Stand tall, constant tension the whole rep.'),
  R('Bayesian Curl', 'biceps', '', 'Cable', 'Face away from the cable, arm behind you, curl forward.'),
  R('Machine Curl', 'biceps', '', 'Machine', 'Line elbows up with the pivot.'),
  R('EZ-Bar Curl', 'biceps', 'forearms', 'Barbell', 'Angled grip, wrists happy, full range.'),
  R('Rope Pushdown', 'triceps', '', 'Cable', 'Elbows at the sides, split the rope at the bottom.'),
  R('Straight-Bar Pushdown', 'triceps', '', 'Cable', 'Lean slightly, lock out and squeeze.'),
  R('Overhead Triceps Extension', 'triceps', '', 'Cable', 'Elbows by the ears, stretch deep behind the head.'),
  R('Skull Crushers', 'triceps', '', 'Barbell', 'Lower to the forehead or behind, elbows stay narrow.'),
  R('Close-Grip Bench Press', 'triceps', 'chest delts', 'Barbell', 'Hands shoulder width, elbows tucked.'),
  R('Machine Triceps Extension', 'triceps', '', 'Machine', 'Elbows on the pad, full lockout.'),
  R('Dumbbell Kickback', 'triceps', '', 'Dumbbell', 'Upper arm parallel to the floor, straighten fully.'),
  R('Wrist Curl', 'forearms', '', 'Dumbbell', 'Forearms on the bench, curl the wrist up.'),
  R('Farmer Carry', 'forearms', 'traps abs', 'Dumbbell', 'Heavy weights, tall posture, short quick steps.'),
  // legs
  R('Back Squat', 'quads', 'glutes adductors lower', 'Barbell', 'Brace, sit between the hips, knees track over toes.'),
  R('Front Squat', 'quads', 'glutes abs', 'Barbell', 'Elbows high, upright torso, full depth.'),
  R('Smith Squat', 'quads', 'glutes', 'Smith', 'Feet slightly forward, controlled depth.'),
  R('Hack Squat', 'quads', 'glutes', 'Machine', 'Shoulders under pads, deep and controlled.'),
  R('Leg Press', 'quads', 'glutes adductors', 'Machine', 'Lower until the hips want to tuck, then press through the whole foot.'),
  R('Goblet Squat', 'quads', 'glutes abs', 'Dumbbell', 'Hold the weight at the chest, elbows inside the knees.'),
  R('Bulgarian Split Squat', 'quads', 'glutes', 'Dumbbell', 'Rear foot on a bench, drop the back knee straight down.'),
  R('Walking Lunge', 'quads', 'glutes hams', 'Dumbbell', 'Long steps, back knee kisses the floor.'),
  R('Step-Up', 'quads', 'glutes', 'Dumbbell', 'Drive through the top foot, do not push off the back leg.'),
  R('Leg Extension', 'quads', '', 'Machine', 'Pause at the top, slow down.'),
  R('Romanian Deadlift', 'hams', 'glutes lower', 'Barbell', 'Soft knees, push the hips back until the hamstrings stretch.'),
  R('Dumbbell Romanian Deadlift', 'hams', 'glutes', 'Dumbbell', 'Dumbbells close to the legs, flat back.'),
  R('Seated Leg Curl', 'hams', 'calves', 'Machine', 'Lean forward a little for more stretch, squeeze at the bottom.'),
  R('Lying Leg Curl', 'hams', 'calves', 'Machine', 'Hips pressed down, curl to the glutes.'),
  R('Nordic Curl', 'hams', '', 'Bodyweight', 'Lower as slowly as you can, catch yourself, push back up.'),
  R('Good Morning', 'hams', 'lower glutes', 'Barbell', 'Bar on the back, hinge with a flat back.'),
  R('Hip Thrust', 'glutes', 'hams', 'Barbell', 'Upper back on a bench, chin tucked, lock the hips out.'),
  R('Glute Bridge', 'glutes', 'hams', 'Bodyweight', 'Drive through the heels, squeeze at the top.'),
  R('Cable Kickback', 'glutes', '', 'Cable', 'Kick back and slightly out, do not arch the lower back.'),
  R('Hip Abduction', 'glutes', '', 'Machine', 'Lean forward slightly, push the knees out.'),
  R('Hip Adduction', 'adductors', '', 'Machine', 'Squeeze the legs together under control.'),
  R('Standing Calf Raise', 'calves', '', 'Machine', 'Full stretch at the bottom, pause at the top.'),
  R('Calf Raise', 'calves', '', 'Machine', 'Full stretch, full rise, 1 second pause.'),
  R('Seated Calf Raise', 'calves', '', 'Machine', 'Knees bent works the soleus. Slow reps.'),
  R('Kettlebell Swing', 'glutes', 'hams lower abs', 'Kettlebell', 'Hike the bell back, snap the hips forward.'),
  // core
  R('Plank', 'abs', 'obliques', 'Bodyweight', 'Ribs down, glutes tight, breathe.'),
  R('Side Plank', 'obliques', 'abs', 'Bodyweight', 'Hips high, body in one straight line.'),
  R('Hanging Leg Raise', 'abs', 'obliques', 'Bodyweight', 'Curl the pelvis up, no swinging.'),
  R('Cable Crunch', 'abs', '', 'Cable', 'Kneel, crunch the ribs toward the hips.'),
  R('Ab Wheel Rollout', 'abs', 'lats', 'Bodyweight', 'Roll out with a hollow body, pull back with the abs.'),
  R('Crunch', 'abs', '', 'Bodyweight', 'Lift the shoulder blades, exhale hard.'),
  R('Russian Twist', 'obliques', 'abs', 'Bodyweight', 'Lean back, rotate the ribs, not just the arms.'),
  R('Pallof Press', 'obliques', 'abs', 'Cable', 'Press out and resist the rotation.'),
  R('Dead Bug', 'abs', '', 'Bodyweight', 'Lower back glued to the floor, opposite arm and leg.'),
  R('Machine Crunch', 'abs', '', 'Machine', 'Slow and controlled, squeeze at the bottom.'),
  // full body / conditioning
  R('Power Clean', 'traps', 'glutes hams quads', 'Barbell', 'Pull, extend, drop under and catch on the shoulders.'),
  R('Thruster', 'quads', 'delts glutes triceps', 'Dumbbell', 'Front squat straight into a press.'),
  R('Burpee', 'quads', 'chest abs delts', 'Bodyweight', 'Chest to the floor, jump at the top.'),
  R('Battle Ropes', 'delts', 'abs forearms', 'Band', 'Fast waves, hips low.'),
  R('Sled Push', 'quads', 'glutes calves', 'Machine', 'Low body angle, drive with short steps.'),
  R('Band Pull-Apart', 'rdelt', 'upper', 'Band', 'Arms straight, pull the band to the chest.'),
];

export const CARDIO = ['Incline walk', 'Walk', 'Run', 'Bike', 'Stairmaster', 'Rower', 'Elliptical', 'Swim', 'HIIT', 'Sport', 'Hike', 'Other'];
// Rough MET values for calorie estimates per minute.
export const CARDIO_MET = { 'Incline walk': 6, Walk: 3.5, Run: 9.8, Bike: 7.5, Stairmaster: 9, Rower: 7, Elliptical: 5, Swim: 7, HIIT: 8, Sport: 7, Hike: 6, Other: 5 };

const byLower = {};
EXERCISES.forEach(x => { byLower[x.n.toLowerCase()] = x; });
const ALIAS = { 'seated row': 'Seated Cable Row', 'v-grip row': 'Seated Cable Row', 'squat': 'Back Squat', 'bench press': 'Barbell Bench Press', 'bench': 'Barbell Bench Press', 'rdl': 'Romanian Deadlift', 'ohp': 'Overhead Press', 'lat raise': 'Dumbbell Lateral Raise', 'lateral raise': 'Dumbbell Lateral Raise', 'tricep pushdown': 'Rope Pushdown', 'leg curl': 'Seated Leg Curl', 'pulldown': 'Lat Pulldown', 'incline bench': 'Incline Barbell Press', 'chest press': 'Machine Chest Press' };
export function findEx(name, custom = []) {
  if (!name) return null;
  const l = String(name).toLowerCase().trim();
  const c = custom.find(x => x.n.toLowerCase() === l);
  if (c) return c;
  if (byLower[l]) return byLower[l];
  if (ALIAS[l]) return byLower[ALIAS[l].toLowerCase()];
  const loose = l.replace(/s\b/g, '').replace(/[^a-z ]/g, '');
  return EXERCISES.find(x => x.n.toLowerCase().replace(/s\b/g, '').replace(/[^a-z ]/g, '') === loose) || null;
}
export const allEx = custom => [...custom, ...EXERCISES];

// Starter programs. Each day lists [exercise, sets, reps].
export const PROGRAMS = {
  fb3: { n: 'Full body, 3 days', d: 'Best start for most people. Mon, Wed, Fri.', days: { 1: 'A', 3: 'B', 5: 'A' }, r: {
    A: ['Full body A', [['Back Squat', 3, '6–10'], ['Barbell Bench Press', 3, '6–10'], ['Lat Pulldown', 3, '8–12'], ['Romanian Deadlift', 2, '8–12'], ['Dumbbell Lateral Raise', 2, '12–20'], ['Plank', 2, '30–60s']]],
    B: ['Full body B', [['Leg Press', 3, '8–12'], ['Incline Dumbbell Press', 3, '8–12'], ['Seated Cable Row', 3, '8–12'], ['Seated Leg Curl', 2, '10–15'], ['Dumbbell Curl', 2, '10–15'], ['Rope Pushdown', 2, '10–15']]] } },
  ul4: { n: 'Upper / Lower, 4 days', d: 'Mon, Tue, Thu, Fri. Great balance of volume and recovery.', days: { 1: 'U', 2: 'L', 4: 'U', 5: 'L' }, r: {
    U: ['Upper', [['Incline Dumbbell Press', 3, '8–12'], ['Chest-Supported Row', 3, '8–12'], ['Machine Chest Press', 2, '10–15'], ['Lat Pulldown', 2, '10–15'], ['Machine Shoulder Press', 2, '8–12'], ['Cable Lateral Raise', 2, '12–20'], ['Hammer Curl', 2, '10–15'], ['Rope Pushdown', 2, '10–15']]],
    L: ['Lower', [['Leg Press', 3, '8–12'], ['Romanian Deadlift', 3, '8–12'], ['Leg Extension', 3, '12–15'], ['Seated Leg Curl', 3, '10–15'], ['Bulgarian Split Squat', 2, '8–12'], ['Calf Raise', 3, '10–15']]] } },
  ppl6: { n: 'Push / Pull / Legs, 6 days', d: 'High frequency for experienced lifters.', days: { 1: 'P', 2: 'U', 3: 'L', 4: 'P', 5: 'U', 6: 'L' }, r: {
    P: ['Push', [['Incline Dumbbell Press', 3, '6–10'], ['Machine Chest Press', 3, '8–12'], ['Pec Deck', 2, '12–20'], ['Cable Lateral Raise', 3, '12–20'], ['Overhead Triceps Extension', 2, '10–15'], ['Rope Pushdown', 2, '10–15']]],
    U: ['Pull', [['Lat Pulldown', 3, '8–12'], ['Seated Cable Row', 3, '8–12'], ['Single-Arm Cable Row', 2, '10–15'], ['Reverse Pec Deck', 2, '12–20'], ['Preacher Curl', 2, '8–12'], ['Hammer Curl', 2, '10–15']]],
    L: ['Legs', [['Back Squat', 3, '6–10'], ['Romanian Deadlift', 3, '8–12'], ['Leg Extension', 2, '12–15'], ['Seated Leg Curl', 3, '10–15'], ['Standing Calf Raise', 3, '10–15'], ['Hanging Leg Raise', 2, '10–15']]] } },
  home3: { n: 'Home, no equipment, 3 days', d: 'Bodyweight only. Mon, Wed, Fri.', days: { 1: 'H', 3: 'H', 5: 'H' }, r: {
    H: ['Bodyweight', [['Push-Up', 3, '8–20'], ['Goblet Squat', 3, '12–20'], ['Glute Bridge', 3, '12–20'], ['Walking Lunge', 2, '10–15'], ['Plank', 3, '30–60s'], ['Dead Bug', 2, '10–15']]] } },
};
