/*
  GROUPINGS
  =========
  The "Browse by ..." sections on Home. These are not separate lists of
  exercises: they're filters on the exercise pool and the workouts, so a new
  exercise or workout shows up in the right place automatically.

  MUSCLE_GROUPS  match an exercise's MAIN muscle (the first one in its `muscles` list).
  WORKOUT_TYPES  match a workout's `tags`.
  `image` is the exercise id whose picture is shown on the tile.
  A group with nothing in it is hidden.
*/

const MUSCLE_GROUPS = [
  { id: "chest", name: "Chest", muscles: ["chest"], image: "chest-press" },
  { id: "back", name: "Back", muscles: ["back", "upper back", "lower back"], image: "lat-pulldown" },
  { id: "legs", name: "Legs", muscles: ["quads", "hamstrings", "glutes"], image: "leg-press" },
  { id: "shoulders", name: "Shoulders", muscles: ["shoulders"], image: "shoulder-press" },
  { id: "arms", name: "Arms", muscles: ["biceps", "triceps"], image: "dumbbell-curl" },
  { id: "core", name: "Core", muscles: ["core"], image: "dead-bug" },
];

const WORKOUT_TYPES = [
  { id: "beginner", name: "Beginner", image: "leg-press" },
  { id: "short", name: "Short", image: "seated-row" },
  { id: "machines", name: "Machines only", image: "leg-extension" },
  { id: "mat", name: "Mat only", image: "bird-dog" },
];
