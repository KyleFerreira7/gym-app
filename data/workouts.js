/*
  WORKOUTS
  ========
  A workout is what you actually start and do: an ordered list of steps, each
  pointing at an exercise id from data/exercises.js. Plans (data/plans.js)
  group workouts into a rotation, but any workout can also be started on its own.

  Workout fields:
    id, name, description
    tags       Used by "Browse by type" on Home (see data/groupings.js),
               e.g. "beginner", "short", "machines", "mat".
    rest       Default seconds of rest after each set.
    easier     Optional: true pre-fills one weight step LESS than last time (and no
               "go up" nudge), for coming back after a break.
    steps      The exercises, in order.

  Step fields:
    exercise   The exercise id.
    sets       Number of working sets.
    reps       Target reps as [min, max], e.g. [8, 12]. Use [8, 8] for exactly 8.
    eachSide   true if the reps are per side (dead bug, bird dog).
    seconds    For timed exercises instead of sets/reps (e.g. 300 = 5 minutes).
    warmUp     true to show a "light warm-up set" tick before the working sets.
    rest       Seconds of rest after each set (falls back to the workout's rest).
*/

const WORKOUTS = [
  // ---------- Full body A/B ----------
  {
    id: "workout-a",
    name: "Workout A",
    description: "Legs, chest and back on the machines, then core on the mat.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "leg-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "chest-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "seated-row", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "leg-curl", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },
  {
    id: "workout-b",
    name: "Workout B",
    description: "Back, shoulders and legs on the machines, then glutes and core on the mat.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "shoulder-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "leg-extension", sets: 3, reps: [10, 12], warmUp: true },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },

  // ---------- Short versions (warm-up + the first three exercises) ----------
  {
    id: "lunch-a",
    name: "Lunch A",
    description: "The short version of Workout A: warm-up and the first three machines.",
    tags: ["short", "machines"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "leg-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "chest-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "seated-row", sets: 3, reps: [8, 12], warmUp: true },
    ],
  },
  {
    id: "lunch-b",
    name: "Lunch B",
    description: "The short version of Workout B: warm-up and the first three machines.",
    tags: ["short", "machines"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "shoulder-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "leg-extension", sets: 3, reps: [10, 12], warmUp: true },
    ],
  },

  // ---------- Push Pull Legs ----------
  {
    id: "push",
    name: "Push",
    description: "Chest, shoulders and triceps: everything that pushes away from you.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "chest-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "shoulder-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "pec-deck", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "triceps-pushdown", sets: 2, reps: [10, 12] },
      { exercise: "incline-push-up", sets: 2, reps: [8, 12] },
    ],
  },
  {
    id: "pull",
    name: "Pull",
    description: "Back and biceps: everything that pulls towards you.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "seated-row", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "assisted-pull-up", sets: 2, reps: [6, 10], warmUp: true },
      { exercise: "dumbbell-curl", sets: 2, reps: [10, 12] },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    description: "Thighs and glutes on the machines, then core on the mat.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "leg-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "leg-curl", sets: 3, reps: [10, 12], warmUp: true },
      { exercise: "leg-extension", sets: 3, reps: [10, 12], warmUp: true },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },

  // ---------- Featured on Home ----------
  {
    id: "quick-20",
    name: "Quick three",
    description: "Three big machines, two sets each, shorter rests. For a busy day.",
    tags: ["short", "machines"],
    rest: 60,
    steps: [
      { exercise: "leg-press", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "chest-press", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "lat-pulldown", sets: 2, reps: [10, 12], warmUp: true },
    ],
  },
  {
    id: "upper-body",
    name: "Upper body",
    description: "Chest, back, shoulders and arms. Pushing and pulling, all in one.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "chest-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "shoulder-press", sets: 2, reps: [8, 12], warmUp: true },
      { exercise: "seated-row", sets: 2, reps: [8, 12], warmUp: true },
      { exercise: "triceps-pushdown", sets: 2, reps: [10, 12] },
      { exercise: "dumbbell-curl", sets: 2, reps: [10, 12] },
    ],
  },
  {
    id: "back-posture",
    name: "Back and posture",
    description: "Rows, pulldowns and the mat work that keeps you standing tall.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "seated-row", sets: 3, reps: [10, 12], warmUp: true },
      { exercise: "lat-pulldown", sets: 3, reps: [10, 12], warmUp: true },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },
  {
    id: "busy-gym",
    name: "Busy gym",
    description: "No machines needed: one bench, a pair of dumbbells and a mat. No queues.",
    tags: ["short"],
    rest: 75,
    steps: [
      { exercise: "incline-dumbbell-press", sets: 3, reps: [8, 12], warmUp: true },
      { exercise: "incline-push-up", sets: 2, reps: [8, 12] },
      { exercise: "dumbbell-curl", sets: 2, reps: [10, 12] },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },
  {
    id: "first-day-back",
    name: "First day back",
    description: "Been away a while? Workout A, two sets each, starting a step lighter " +
      "than last time. Ease back in.",
    tags: ["beginner", "short"],
    rest: 90,
    easier: true,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "leg-press", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "chest-press", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "seated-row", sets: 2, reps: [10, 12], warmUp: true },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },

  // ---------- Cardio ----------
  {
    id: "cardio-20",
    name: "Cardio 20",
    description: "Ten minutes on the treadmill, ten on the bike. A simple heart-and-lungs session.",
    tags: ["cardio", "short"],
    rest: 60,
    steps: [
      { exercise: "treadmill-walk", seconds: 600 },
      { exercise: "bike", seconds: 600 },
    ],
  },
  {
    id: "cardio-mix",
    name: "Cardio mix",
    description: "Three machines, eight minutes each. Keeps it interesting.",
    tags: ["cardio"],
    rest: 60,
    steps: [
      { exercise: "treadmill-walk", seconds: 480 },
      { exercise: "cross-trainer", seconds: 480 },
      { exercise: "rowing-machine", seconds: 480 },
    ],
  },
  {
    id: "incline-walk",
    name: "Incline walk",
    description: "Thirty minutes of brisk walking uphill. Easy on the joints, good for the heart.",
    tags: ["cardio"],
    rest: 60,
    steps: [{ exercise: "treadmill-walk", seconds: 1800 }],
  },

  // ---------- Swimming. For swims, sets = repeats and reps = lengths per repeat. ----------
  {
    id: "easy-swim",
    name: "Easy swim",
    description: "A gentle mix of strokes with short rests. About 20 lengths in a 25 m pool.",
    tags: ["swim", "beginner"],
    rest: 30,
    steps: [
      { exercise: "breaststroke", sets: 1, reps: [4, 4] },
      { exercise: "freestyle", sets: 4, reps: [2, 2] },
      { exercise: "kickboard-kick", sets: 4, reps: [1, 1] },
      { exercise: "backstroke", sets: 2, reps: [2, 2] },
    ],
  },
  {
    id: "swim-drills",
    name: "Technique drills",
    description: "Legs only, arms only, then put it together. Better strokes, not more lengths.",
    tags: ["swim"],
    rest: 30,
    steps: [
      { exercise: "breaststroke", sets: 1, reps: [2, 2] },
      { exercise: "kickboard-kick", sets: 4, reps: [1, 1] },
      { exercise: "pull-buoy", sets: 4, reps: [1, 1] },
      { exercise: "freestyle", sets: 4, reps: [1, 1] },
      { exercise: "backstroke", sets: 2, reps: [1, 1] },
    ],
  },
  {
    id: "steady-swim",
    name: "Steady 20 lengths",
    description: "Five repeats of four lengths of freestyle. 500 m in a 25 m pool.",
    tags: ["swim"],
    rest: 45,
    steps: [
      { exercise: "breaststroke", sets: 1, reps: [2, 2] },
      { exercise: "freestyle", sets: 5, reps: [4, 4] },
    ],
  },

  // ---------- Mat only ----------
  {
    id: "core-mat",
    name: "Core on the mat",
    description: "A short core session you can do on any mat, no machines needed.",
    tags: ["short", "mat"],
    rest: 60,
    steps: [
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "bicycle-crunch", sets: 2, reps: [10, 10], eachSide: true },
    ],
  },
];
