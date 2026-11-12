/*
  WORKOUTS
  ========
  A workout is what you actually start and do: an ordered list of steps, each
  pointing at an exercise id from data/exercises.js. Plans (data/plans.js)
  group workouts into a rotation, but any workout can also be started on its own.

  Workout fields:
    id, name, description
    tags       Used by "Browse by type" on Home (see data/groupings.js),
               e.g. "beginner", "machines", "free-weights", "mat".
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
    rest       Seconds of rest after each set (falls back to the workout's rest).
*/

const WORKOUTS = [
  // ---------- Full body ----------
  {
    // Added 2026-11-12: the best of the old Workout A and B in one.
    id: "full-body-machines",
    name: "Full body A",  // machines
    description: "Legs, chest, back and shoulders on the machines, then core. A simple, " +
      "complete workout.",
    tags: ["beginner", "machines"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "leg-press", sets: 3, reps: [8, 12] },
      { exercise: "chest-press", sets: 3, reps: [8, 12] },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12] },
      { exercise: "shoulder-press", sets: 2, reps: [8, 12] },
      { exercise: "leg-curl", sets: 2, reps: [10, 12] },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },
  {
    // Added 2026-11-12.
    id: "full-body-free-weights",
    name: "Full body B",  // free weights
    description: "A full workout with dumbbells and a bench: chest, back, legs, shoulders and " +
      "core. The next step up from the machines.",
    tags: ["free-weights"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "dumbbell-bench-press", sets: 3, reps: [8, 12] },
      { exercise: "single-arm-dumbbell-row", sets: 3, reps: [8, 12] },
      { exercise: "dumbbell-romanian-deadlift", sets: 3, reps: [10, 12] },
      { exercise: "dumbbell-hip-thrust", sets: 2, reps: [10, 12] },
      { exercise: "lateral-raise", sets: 2, reps: [12, 15], rest: 60 },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
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
      { exercise: "chest-press", sets: 3, reps: [8, 12] },
      { exercise: "shoulder-press", sets: 3, reps: [8, 12] },
      { exercise: "pec-deck", sets: 2, reps: [10, 12] },
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
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12] },
      { exercise: "seated-row", sets: 3, reps: [8, 12] },
      { exercise: "single-arm-dumbbell-row", sets: 2, reps: [10, 12] },
      { exercise: "assisted-pull-up", sets: 2, reps: [6, 10] },
      { exercise: "dumbbell-curl", sets: 2, reps: [10, 12] },
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
      { exercise: "leg-press", sets: 3, reps: [8, 12] },
      { exercise: "leg-curl", sets: 3, reps: [10, 12] },
      { exercise: "leg-extension", sets: 3, reps: [10, 12] },
      { exercise: "hip-thrust-machine", sets: 3, reps: [10, 12] },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },

  // ---------- Featured on Home ----------
  {
    id: "upper-body",
    name: "Upper body",
    description: "Chest, back, shoulders and arms. Pushing and pulling, all in one.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "chest-press", sets: 3, reps: [8, 12] },
      { exercise: "lat-pulldown", sets: 3, reps: [8, 12] },
      { exercise: "shoulder-press", sets: 2, reps: [8, 12] },
      { exercise: "seated-row", sets: 2, reps: [8, 12] },
      { exercise: "triceps-pushdown", sets: 2, reps: [10, 12] },
      { exercise: "dumbbell-curl", sets: 2, reps: [10, 12] },
    ],
  },
  {
    id: "back-posture",
    name: "Back",
    description: "Rows, pulldowns and the mat work that keeps you standing tall.",
    tags: ["beginner"],
    rest: 90,
    steps: [
      { exercise: "bike", seconds: 300 },
      { exercise: "seated-row", sets: 3, reps: [10, 12] },
      { exercise: "lat-pulldown", sets: 3, reps: [10, 12] },
      { exercise: "dumbbell-romanian-deadlift", sets: 2, reps: [10, 12] },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
    ],
  },

  // ---------- Mat only ----------
  {
    id: "core-mat",
    name: "Core",
    description: "A short core session you can do on any mat, no machines needed.",
    tags: ["mat"],
    rest: 60,
    steps: [
      { exercise: "dead-bug", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "bird-dog", sets: 2, reps: [8, 8], eachSide: true },
      { exercise: "glute-bridge", sets: 2, reps: [12, 12] },
      { exercise: "bicycle-crunch", sets: 2, reps: [10, 10], eachSide: true },
    ],
  },
];

// Workouts removed on 2026-11-12. Kept by name only, so older history entries still
// show what they were (newer ones save the name with the workout).
const RETIRED_WORKOUT_NAMES = {
  "workout-a": "Workout A",
  "workout-b": "Workout B",
  "lunch-a": "Lunch A",
  "lunch-b": "Lunch B",
  "quick-20": "Quick three",
  "busy-gym": "Busy gym",
  "first-day-back": "First day back",
};
