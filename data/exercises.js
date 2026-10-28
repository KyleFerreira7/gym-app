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
    type       "reps" (count sets and reps) or "timed" (a countdown).
    cue        One short line shown during the workout.
    howTo      The full instructions (shown when you tap "How to").
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
  // ---------- Warm-up ----------
  {
    id: "bike",
    name: "Exercise bike",
    muscles: ["cardio"],
    equipment: "cardio",
    type: "timed",
    cue: "Easy pace. You should be able to chat.",
    howTo: "Set the seat so your leg is nearly straight at the bottom of each pedal stroke. " +
      "Pick a low resistance and pedal at an easy, steady pace to warm up.",
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
      "through your whole foot. Don't lock your knees straight at the top.",
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
      "slowly. Don't lean back to swing it.",
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
  },
  {
    id: "glute-bridge",
    name: "Glute bridge",
    muscles: ["glutes", "hamstrings"],
    equipment: "mat",
    type: "reps",
    cue: "Squeeze your glutes, lift to a straight line, pause.",
    howTo: "Lie on your back, knees bent, feet flat. Squeeze your glutes and lift your hips until " +
      "your body is a straight line from knees to shoulders. Pause, lower. Later: a dumbbell " +
      "on your hips, or the hip thrust machine.",
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
  },
];
