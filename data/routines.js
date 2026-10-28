/*
  ROUTINES
  ========
  A routine is an ordered list of steps. Each step points at an exercise id
  from data/exercises.js and says how much of it to do.

  Step fields:
    exercise   The exercise id.
    sets       Number of working sets.
    reps       Target reps as [min, max], e.g. [8, 12]. Use [8, 8] for exactly 8.
    eachSide   true if the reps are per side (dead bug, bird dog).
    seconds    For timed exercises instead of sets/reps (e.g. 300 = 5 minutes).
    warmUp     true to show a "light warm-up set" tick before the working sets.
    rest       Seconds of rest after each set (falls back to the routine's rest).
*/

const ROUTINES = [
  {
    id: "workout-a",
    name: "Workout A",
    description: "Legs, chest and back on the machines, then core on the mat.",
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
];
