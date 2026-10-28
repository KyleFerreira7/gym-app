/*
  THE EXERCISE POOL
  =================
  One entry per exercise. This is the foundation of the app: routines, browsing
  and stats are all built on top of this list.

  To add an exercise:
    1. Save its illustration as images/exercises/<id>.png
       and run:  python3 tools/resize_images.py
    2. Copy an entry below, paste it at the end of the list, and fill it in.
  No image yet? That's fine: the app shows a placeholder.

  Fields:
    id         Short name with dashes. Must match the image file name.
    name       What the app shows.
    muscles    Muscles worked, MAIN one first. The first one decides where it shows
               in "Browse by muscle" (see data/groupings.js).
    equipment  "machine", "cable", "dumbbell", "mat" or "cardio".
    type       "reps" (count sets and reps), "cardio" (a countdown, logged in minutes) or
               "swim" (repeats of a number of pool lengths; equipment "pool").
    metrics    Cardio only: what you can note for it, any of "level", "speed" (km/h),
               "incline" (%) and "distance" (km). Shown as − / + under the timer.
    cue        One short line shown during the workout.
    howTo      The full instructions, one step per sentence (shown under (i)).
    tips       Optional: short tips, shown under (i).
    mistakes   Optional: common mistakes to avoid, shown under (i).
    eachSide   Optional: true if reps are counted per side (used when building a workout).
    swapFor    Optional: exercise ids this one is a good stand-in for, when that
               machine is taken. The swap list shows these first, then other exercises
               for the same main muscle.
    startKg    Optional: the weight to suggest the very first time (otherwise a light
               default for the equipment: machine 20, cable 10, dumbbell 4 kg).

  Note: this file is plain JavaScript, so text goes in "quotes" and every
  entry ends with a comma.
*/

const EXERCISES = [
  // ---------- Cardio ----------
  {
    id: "bike",
    name: "Exercise bike",
    muscles: ["cardio"],
    equipment: "cardio",
    type: "cardio",
    metrics: ["level", "distance"],
    cue: "Easy pace. You should be able to chat.",
    howTo: "Set the seat so your leg is nearly straight at the bottom of each pedal stroke. " +
      "Pick a low resistance and pedal at an easy, steady pace to warm up.",
    tips: [
      "Aim for a light sweat by the end, not out of breath.",
      "Use the five minutes to look at your first machine.",
    ],
    mistakes: [
      "Seat too low, so your knees come up high.",
      "Going hard: this is only a warm-up.",
    ],
  },

  {
    id: "treadmill-walk",
    name: "Treadmill",
    muscles: ["cardio", "glutes"],
    equipment: "cardio",
    type: "cardio",
    metrics: ["speed", "incline", "distance"],
    cue: "Brisk walk on an incline. Hands off the rails if you can.",
    howTo: "Step on with the belt stopped and press start. Walk at an easy pace for a minute, " +
      "then raise the incline and speed until you're breathing harder but can still talk. " +
      "Lower both for the last minute to cool down.",
    tips: [
      "An incline walk is easy on the joints and works your glutes.",
      "Take normal steps and stay near the front of the belt.",
    ],
    mistakes: [
      "Hanging on to the rails, which takes away most of the work.",
      "Starting fast instead of warming up first.",
    ],
  },
  {
    id: "cross-trainer",
    name: "Cross-trainer",
    muscles: ["cardio", "quads"],
    equipment: "cardio",
    type: "cardio",
    metrics: ["level", "distance"],
    cue: "Smooth, steady strides. Push and pull the handles.",
    howTo: "Step onto the pedals and hold the moving handles. Start striding to wake the machine up, " +
      "pick a level, then keep a smooth rhythm, pushing and pulling with your arms as your legs move.",
    tips: [
      "Push through your heels to use your glutes more.",
      "Go backwards for a minute to change it up.",
    ],
    mistakes: [
      "Standing on your toes.",
      "Letting the machine's momentum do the work at a very low level.",
    ],
  },
  {
    id: "rowing-machine",
    name: "Rowing machine",
    muscles: ["cardio", "back"],
    equipment: "cardio",
    type: "cardio",
    metrics: ["level", "distance"],
    cue: "Legs, then lean back, then arms. Reverse on the way in.",
    howTo: "Strap your feet in with the strap across the widest part of your foot. Push with your legs " +
      "first, lean back slightly, then pull the handle to your lower ribs. Come back in the opposite " +
      "order: arms, then lean forward, then bend your knees.",
    tips: [
      "Most of the power comes from your legs.",
      "Keep the damper (the lever on the fan) around 3 to 5.",
    ],
    mistakes: [
      "Pulling with your arms before your legs have pushed.",
      "Rounding your back at the front of the stroke.",
    ],
  },
  {
    id: "stair-climber",
    name: "Stair climber",
    muscles: ["cardio", "glutes"],
    equipment: "cardio",
    type: "cardio",
    metrics: ["level"],
    cue: "Steady steps, upright posture, light hands on the rails.",
    howTo: "Hold the rails, step on and press start at a low level. Step with your whole foot on each " +
      "stair, stand tall and keep a steady pace. Raise the level once you're warm.",
    tips: [
      "Short sessions are tough: start with 5 to 10 minutes.",
      "Light hands on the rails, for balance only.",
    ],
    mistakes: [
      "Leaning heavily on the rails.",
      "Only using your toes on each step.",
    ],
  },

  // ---------- Swimming ----------
  {
    id: "freestyle",
    name: "Freestyle",
    muscles: ["cardio", "shoulders", "back"],
    equipment: "pool",
    type: "swim",
    cue: "Long, relaxed strokes. Breathe to the side every 2 or 3 strokes.",
    howTo: "Float face down with your body long and flat. Reach forward with one arm at a time, " +
      "pull the water back past your hip, and kick small and steady from the hips. Turn your " +
      "head to the side to breathe as that arm comes out of the water.",
    tips: [
      "Breathe out under water, so you only breathe in when you turn.",
      "Slow and smooth beats fast and splashy.",
    ],
    mistakes: [
      "Lifting your head forward to breathe, which drops your legs.",
      "Big kicks from the knees instead of the hips.",
    ],
  },
  {
    id: "breaststroke",
    name: "Breaststroke",
    muscles: ["cardio", "quads", "chest"],
    equipment: "pool",
    type: "swim",
    cue: "Pull, breathe, kick, glide.",
    howTo: "Start long and flat with your arms in front. Sweep your hands out and round, lifting " +
      "your head to breathe. Bring your heels towards you, then kick them out and back together " +
      "as your arms shoot forward. Glide for a moment before the next stroke.",
    tips: [
      "The glide is where the speed is: don't rush it.",
      "A good stroke to rest on between harder lengths.",
    ],
    mistakes: [
      "Keeping your head up the whole time.",
      "No glide, so every stroke starts from a standstill.",
    ],
  },
  {
    id: "backstroke",
    name: "Backstroke",
    muscles: ["cardio", "back", "shoulders"],
    equipment: "pool",
    type: "swim",
    cue: "Hips up, ears in the water, arms like a windmill.",
    howTo: "Lie on your back with your ears in the water and your hips high. Kick steadily from " +
      "the hips. Lift one straight arm over your head, enter the water little finger first, and " +
      "push the water down towards your feet. Alternate arms.",
    tips: [
      "Look straight up, not at your feet.",
      "Count your strokes from the flags to the wall, so you don't hit your head.",
    ],
    mistakes: [
      "Sitting in the water with your hips low.",
      "Bending your knees so they come out of the water.",
    ],
  },
  {
    id: "kickboard-kick",
    name: "Kick with a board",
    muscles: ["cardio", "quads", "glutes"],
    equipment: "pool",
    type: "swim",
    cue: "Hold the board, arms straight, kick from the hips.",
    howTo: "Hold a kickboard at the far end with straight arms and lie flat on the water. Kick " +
      "with straight-ish legs from the hips, toes pointed, making small splashes at the surface.",
    tips: [
      "Point your toes: floppy ankles make it much slower.",
      "Put your face in the water between breaths to keep your hips up.",
    ],
    mistakes: [
      "Kicking from the knees, like cycling.",
      "Big splashy kicks that waste energy.",
    ],
  },
  {
    id: "pull-buoy",
    name: "Pull with a buoy",
    muscles: ["cardio", "back", "shoulders"],
    equipment: "pool",
    type: "swim",
    cue: "Buoy between your thighs, arms only, no kicking.",
    howTo: "Squeeze a pull buoy between your upper thighs so your legs float. Swim freestyle with " +
      "your arms only, keeping your legs still and your body long.",
    tips: [
      "Great for practising your arm stroke and breathing.",
      "Keep your stomach tight so your hips don't sway.",
    ],
    mistakes: [
      "Kicking anyway, so the buoy slips out.",
      "Shortening your stroke: reach long and pull all the way back.",
    ],
  },

  // ---------- Workout A ----------
  {
    id: "leg-press",
    name: "Leg press",
    muscles: ["quads", "glutes"],
    equipment: "machine",
    type: "reps",
    cue: "Lower to about 90°, push through your whole foot.",
    howTo: "Sit back with your lower back flat on the pad. Feet flat, hip-width, middle of the " +
      "platform. Release the handles, lower until your knees are about 90°, push back up " +
      "through your whole foot.",
    tips: [
      "Breathe out as you push, in as you lower.",
      "Keep your head and back resting on the pad.",
    ],
    mistakes: [
      "Locking your knees straight at the top.",
      "Lower back lifting off the pad at the bottom.",
      "Knees caving inwards.",
    ],
  },
  {
    id: "chest-press",
    name: "Chest press",
    muscles: ["chest", "shoulders", "triceps"],
    equipment: "machine",
    type: "reps",
    cue: "Handles level with mid-chest. Push out, come back slowly.",
    howTo: "Seat so the handles are level with the middle of your chest. Back flat on the pad. " +
      "Push out until your arms are nearly straight, then come back slowly until your hands " +
      "are just in front of your chest.",
    tips: [
      "Keep your shoulder blades back against the pad.",
      "Push in one smooth line; don't jerk the handles.",
    ],
    mistakes: [
      "Seat at the wrong height, so the handles start at your neck or your belly.",
      "Shoulders rolling forward off the pad.",
    ],
  },
  {
    id: "seated-row",
    name: "Seated cable row",
    muscles: ["upper back", "biceps"],
    equipment: "cable",
    type: "reps",
    cue: "Sit tall. Pull to your lower ribs, squeeze your shoulder blades.",
    howTo: "Sit tall with your feet on the platform and knees slightly bent. Pull the handle to " +
      "your lower ribs, squeezing your shoulder blades together, then let your arms straighten " +
      "slowly.",
    tips: [
      "Start each pull by squeezing your shoulder blades together.",
      "Chest up, shoulders down and away from your ears.",
    ],
    mistakes: [
      "Leaning back to swing the weight.",
      "Rounding your back as the handle goes forward.",
    ],
  },
  {
    id: "leg-curl",
    name: "Leg curl",
    muscles: ["hamstrings"],
    equipment: "machine",
    type: "reps",
    cue: "Knee in line with the pivot. Curl, then lower slowly.",
    howTo: "Line your knee up with the machine's pivot (the coloured dot). Pad just above your " +
      "heels. Curl your heels towards you, then lower slowly.",
    tips: [
      "Come back up slowly: that half counts too.",
      "Hold the handles to keep your hips down.",
    ],
    mistakes: [
      "Knee not lined up with the pivot.",
      "Lifting your hips to help the weight.",
    ],
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    muscles: ["core"],
    equipment: "mat",
    type: "reps",
    eachSide: true,
    cue: "Lower back pressed down. Slow beats fast.",
    howTo: "Lie on your back, arms up, knees bent at 90° above your hips. Press your lower back " +
      "into the mat. Slowly straighten the opposite arm and leg towards the floor, come back, " +
      "swap sides. Slow beats fast.",
    tips: [
      "Breathe out as you reach.",
      "Only go as low as you can keep your back flat.",
    ],
    mistakes: [
      "Lower back arching off the mat.",
      "Rushing the reps.",
    ],
  },

  // ---------- Workout B ----------
  {
    id: "lat-pulldown",
    name: "Lat pulldown",
    muscles: ["back", "biceps"],
    equipment: "machine",
    type: "reps",
    cue: "Pull the bar to your upper chest, elbows down and back.",
    howTo: "Set the thigh pad so your legs are snug under it. Grip the bar a bit wider than your " +
      "shoulders. Lean back very slightly, pull the bar to your upper chest, elbows going down " +
      "and back. Let it up slowly until your arms are straight.",
    tips: [
      "Think \"elbows to your back pockets\".",
      "Keep your chest up towards the bar.",
    ],
    mistakes: [
      "Pulling the bar behind your head.",
      "Leaning far back and swinging.",
    ],
  },
  {
    id: "shoulder-press",
    name: "Shoulder press",
    muscles: ["shoulders", "triceps"],
    equipment: "machine",
    type: "reps",
    cue: "Start at shoulder height. Press up, lower slowly.",
    howTo: "Seat so the handles start at about shoulder height. Back on the pad. Press up until " +
      "your arms are nearly straight, lower slowly.",
    tips: [
      "Keep your back on the pad and your stomach tight.",
      "Breathe out as you press up.",
    ],
    mistakes: [
      "Arching your lower back to push.",
      "Locking your elbows hard at the top.",
    ],
  },
  {
    id: "leg-extension",
    name: "Leg extension",
    muscles: ["quads"],
    equipment: "machine",
    type: "reps",
    cue: "Knee in line with the pivot. Straighten, pause, lower.",
    howTo: "Back against the pad, knee lined up with the pivot (coloured dot), pad on the front " +
      "of your shins just above your ankles. Straighten your legs, pause, lower slowly.",
    tips: [
      "Pause for a second at the top.",
      "Hold the side handles to stay seated.",
    ],
    mistakes: [
      "Kicking the weight up fast.",
      "Knee not lined up with the pivot.",
    ],
  },
  {
    id: "glute-bridge",
    name: "Glute bridge",
    muscles: ["glutes", "hamstrings"],
    equipment: "mat",
    type: "reps",
    cue: "Squeeze your glutes, lift to a straight line, pause.",
    howTo: "Lie on your back, knees bent, feet flat. Squeeze your glutes and lift your hips until " +
      "your body is a straight line from knees to shoulders. Pause, lower.",
    tips: [
      "Push through your heels.",
      "Squeeze your glutes for a second at the top.",
      "Later: a dumbbell on your hips, or the hip thrust machine.",
    ],
    mistakes: [
      "Arching your lower back instead of using your glutes.",
      "Feet too far away from your hips.",
    ],
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    muscles: ["core", "lower back"],
    equipment: "mat",
    type: "reps",
    eachSide: true,
    cue: "Opposite arm and leg out, hips level, pause.",
    howTo: "On hands and knees. Reach one arm forward and the opposite leg back, keeping your " +
      "hips level, pause, return, swap.",
    tips: [
      "Imagine a glass of water balanced on your lower back.",
      "Reach long, not high.",
    ],
    mistakes: [
      "Hips tipping to one side.",
      "Lifting the leg so high your back arches.",
    ],
  },

  // ---------- Extras (not in a routine yet) ----------
  {
    id: "assisted-pull-up",
    name: "Assisted pull-up",
    muscles: ["back", "biceps"],
    equipment: "machine",
    type: "reps",
    swapFor: ["lat-pulldown"],
    cue: "More assistance weight makes it easier.",
    howTo: "Kneel or stand on the platform and grip the handles. Pull up until your chin is over " +
      "the handles, then lower slowly until your arms are straight.",
    tips: [
      "Pull your shoulders down before you bend your arms.",
      "Use less assistance weight as you get stronger.",
    ],
    mistakes: [
      "Kicking or swinging to get up.",
      "Dropping down fast.",
    ],
  },
  {
    id: "triceps-pushdown",
    name: "Triceps pushdown",
    muscles: ["triceps"],
    equipment: "cable",
    type: "reps",
    cue: "Elbows tucked at your sides. Only your forearms move.",
    howTo: "Stand facing the cable with the bar or rope at chest height. Keep your elbows at your " +
      "sides and push down until your arms are straight, then let it rise slowly.",
    tips: [
      "Squeeze for a second at the bottom.",
      "Stand close with a slight forward lean.",
    ],
    mistakes: [
      "Elbows drifting forward.",
      "Leaning over the bar to push with your body.",
    ],
  },
  {
    id: "dumbbell-curl",
    name: "Dumbbell curl",
    muscles: ["biceps"],
    equipment: "dumbbell",
    type: "reps",
    cue: "Elbows still. Curl up, lower slowly.",
    howTo: "Stand tall with a dumbbell in each hand, palms forward. Keep your elbows at your sides, " +
      "curl the weights up, then lower slowly. No swinging.",
    tips: [
      "Lower slower than you lift.",
      "Keep your wrists straight.",
    ],
    mistakes: [
      "Swinging your back to lift the weight.",
      "Elbows moving forward.",
    ],
  },
  {
    id: "pec-deck",
    name: "Pec deck",
    muscles: ["chest"],
    equipment: "machine",
    type: "reps",
    cue: "Slight bend in the elbows. Bring the handles together.",
    howTo: "Seat so the handles are at chest height. Keep a slight bend in your elbows and bring " +
      "the handles together in front of you, then open slowly.",
    tips: [
      "Squeeze your chest when the handles meet.",
      "Keep your back on the pad.",
    ],
    mistakes: [
      "Arms locked straight.",
      "Letting the handles go too far back.",
    ],
  },
  {
    id: "goblet-squat",
    name: "Goblet squat",
    muscles: ["quads", "glutes"],
    equipment: "dumbbell",
    type: "reps",
    swapFor: ["leg-press", "leg-extension"],
    cue: "Hold the weight at your chest. Sit down between your heels.",
    howTo: "Hold one dumbbell upright against your chest. Feet a bit wider than your hips. Sit " +
      "down between your heels, chest up, then stand back up.",
    tips: [
      "Keep your chest up and the weight close to you.",
      "Push your knees out over your toes.",
    ],
    mistakes: [
      "Heels lifting off the floor.",
      "Rounding your back.",
    ],
  },
  {
    id: "incline-dumbbell-press",
    name: "Incline dumbbell press",
    muscles: ["chest", "shoulders", "triceps"],
    equipment: "dumbbell",
    type: "reps",
    swapFor: ["chest-press"],
    cue: "Press up over your chest, lower slowly.",
    howTo: "Lie on a bench set to a low incline, a dumbbell in each hand at chest level. Press " +
      "up until your arms are nearly straight, then lower slowly.",
    tips: [
      "Lower the dumbbells to the sides of your chest.",
      "Keep your feet flat on the floor.",
    ],
    mistakes: [
      "Bench set too steep.",
      "Bouncing the weights at the bottom.",
    ],
  },
  {
    id: "incline-push-up",
    name: "Incline push-up",
    muscles: ["chest", "triceps"],
    equipment: "mat",
    type: "reps",
    swapFor: ["chest-press"],
    cue: "Hands on a bench, body in a straight line.",
    howTo: "Hands on a bench or bar, a bit wider than your shoulders. Body in a straight line " +
      "from head to heels. Lower your chest towards the bench, then push back up.",
    tips: [
      "The higher your hands, the easier it is.",
      "Squeeze your glutes to keep a straight line.",
    ],
    mistakes: [
      "Hips sagging.",
      "Elbows flared straight out to the sides.",
    ],
  },
  {
    id: "bicycle-crunch",
    name: "Bicycle crunch",
    muscles: ["core"],
    equipment: "mat",
    type: "reps",
    eachSide: true,
    cue: "Elbow towards the opposite knee, slowly.",
    howTo: "Lie on your back, hands lightly behind your head. Bring one knee in while turning the " +
      "opposite elbow towards it, then swap sides. Move slowly.",
    tips: [
      "Turn from your ribs, not just your elbows.",
      "Breathe out as you twist.",
    ],
    mistakes: [
      "Pulling on your neck.",
      "Going too fast.",
    ],
  },
];
