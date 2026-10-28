/*
  STORAGE
  =======
  Everything the app remembers lives in one object, `DB`, which is saved to the
  phone's localStorage (a small key-value store each website gets) as text.

  All saving and loading goes through this file. If we later move to a bigger
  store or to accounts, only this file needs to change.

  What's in DB:
    logs             Every set you've done (the history growth/stats are built from):
                     { id, sessionId, workoutId, exerciseId, set, weightKg, reps,
                       seconds, date: "YYYY-MM-DD", at: timestamp }
                     Memory belongs to the EXERCISE: the leg press remembers your
                     numbers whichever workout it's in.
    sessions         Every workout you finished:
                     { id, workoutId, date, startedAt, finishedAt, completed }
    machineSettings  Your notes per exercise, e.g. { "leg-press": "Seat 5" }
    weightSteps      How much − / + changes the weight, per exercise, e.g. { "leg-press": 5 }
    locations        Where each machine is in my gym, e.g. { "leg-press": "Back left, by the mirrors" }
    customWorkouts   Workouts I built myself, same shape as in data/workouts.js
                     (ids start with "my-").
    activePlanId     The plan whose next workout Home suggests (data/plans.js).
    lastBackupAt     When you last saved a backup file (timestamp), for the reminder.
    current          The workout in progress (null when there isn't one).
                     Saved after every change, so a locked phone loses nothing.
*/

const STORAGE_KEY = "gym-app";

function emptyDB() {
  return {
    version: 2, logs: [], sessions: [], machineSettings: {}, weightSteps: {}, locations: {}, customWorkouts: [], current: null,
    activePlanId: PLANS[0].id, lastBackupAt: null,
  };
}

function loadDB() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyDB();
    // Merge with an empty DB so any field added in a later version exists.
    return upgrade({ ...emptyDB(), ...JSON.parse(text) });
  } catch (error) {
    console.error("Could not read saved data", error);
    return emptyDB();
  }
}

// Bring data saved by an older version of the app up to date.
function upgrade(db) {
  if (db.version < 2) {
    // Version 1 called workouts "routines".
    const rename = (record) => {
      if (record && record.routineId) {
        record.workoutId = record.routineId;
        delete record.routineId;
      }
    };
    db.logs.forEach(rename);
    db.sessions.forEach(rename);
    rename(db.current);
    db.version = 2;
  }
  return db;
}

// The one copy of the data the whole app reads and changes.
const DB = loadDB();

function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  } catch (error) {
    console.error("Could not save data", error);
  }
}

// ---------- Small helpers ----------

// Today's date as "YYYY-MM-DD", in the phone's own time zone.
function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// A random id like "k3x9q2a1", good enough to tell records apart.
function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- Questions the screens ask about the data ----------

// The sets from the last time you did this exercise (not counting the current workout).
// Returns { date, sets: [log, log, ...] } or null if you've never done it.
function lastTimeFor(exerciseId, excludeSessionId) {
  const past = DB.logs.filter(
    (log) => log.exerciseId === exerciseId && log.sessionId !== excludeSessionId
  );
  if (past.length === 0) return null;

  // The most recent log tells us which workout was "last time".
  const latest = past.reduce((a, b) => (b.at > a.at ? b : a));
  const sets = past
    .filter((log) => log.sessionId === latest.sessionId)
    .sort((a, b) => a.set - b.set);
  return { date: latest.date, sets };
}

// The sets already ticked in this workout for one exercise.
function setsThisSession(sessionId, exerciseId) {
  return DB.logs.filter((log) => log.sessionId === sessionId && log.exerciseId === exerciseId);
}

// Every workout: the built-in ones (data/workouts.js) plus the ones I built.
function allWorkouts() {
  return [...WORKOUTS, ...DB.customWorkouts];
}

function activePlan() {
  return PLANS.find((p) => p.id === DB.activePlanId) || PLANS[0];
}

// Which workout to suggest: the one after the last completed workout of your
// active plan (A → B → A ..., or Push → Pull → Legs → Push ...).
function nextWorkoutId() {
  const plan = activePlan();
  const done = DB.sessions.filter((s) => s.completed && plan.workouts.includes(s.workoutId));
  if (done.length === 0) return plan.workouts[0];
  const index = plan.workouts.indexOf(done[done.length - 1].workoutId);
  return plan.workouts[(index + 1) % plan.workouts.length];
}

// How many workouts were completed this week (weeks start on Monday).
function workoutsThisWeek() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayISO = todayISO(monday);
  return DB.sessions.filter((s) => s.completed && s.date >= mondayISO).length;
}

function lastSession() {
  const done = DB.sessions.filter((s) => s.completed);
  return done.length ? done[done.length - 1] : null;
}
