/*
  PLANS
  =====
  A plan is a rotation of workouts you follow over the weeks. The app suggests
  the next workout in your active plan ("Up next" on Home), going round in order:
  A → B → A ..., or Push → Pull → Legs → Push ...
  You can still start any workout on its own; the plan only decides the suggestion.

  Fields:
    id, name, description
    workouts   Workout ids from data/workouts.js, in the order they rotate.
*/

const PLANS = [
  {
    id: "full-body-ab",
    name: "Full body A/B",
    description: "Two full-body workouts, alternated. Every muscle twice a week if you go " +
      "2–3 times. The best fit for starting out.",
    workouts: ["workout-a", "workout-b"],
  },
  {
    id: "push-pull-legs",
    name: "Push Pull Legs",
    description: "Three workouts, each focused on one part of the body. Makes most sense " +
      "when you train 4 or more days a week.",
    workouts: ["push", "pull", "legs"],
  },
];

/*
  FEATURED
  ========
  The extra cards in the swipe row at the top of Home, after your plan's workouts
  and your own. Each is a workout id plus a short label shown above its name.
*/

const FEATURED = [
  { workout: "quick-20", label: "Quick" },
  { workout: "upper-body", label: "Focus" },
  { workout: "back-posture", label: "Focus" },
  { workout: "busy-gym", label: "Busy gym?" },
  { workout: "first-day-back", label: "Been away?" },
  { workout: "lunch-a", label: "Quick" },
  { workout: "core-mat", label: "Mat only" },
  { workout: "cardio-mix", label: "Cardio" },
  { workout: "incline-walk", label: "Cardio" },
];
