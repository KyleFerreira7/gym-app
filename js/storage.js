/*
  STORAGE
  =======
  Everything the app remembers lives in one object, `DB`, which is saved to the
  phone's localStorage (a small key-value store each website gets) as text.

  All saving and loading goes through this file. If we later move to a bigger
  store or to accounts, only this file needs to change.

  What's in DB:
    logs             Every set you've done (the history growth/stats are built from):
                     { id, sessionId, routineId, exerciseId, set, weightKg, reps,
                       seconds, date: "YYYY-MM-DD", at: timestamp }
    sessions         Every workout you finished:
                     { id, routineId, date, startedAt, finishedAt, completed }
    machineSettings  Your notes per exercise, e.g. { "leg-press": "Seat 5" }
    current          The workout in progress (null when there isn't one).
                     Saved after every change, so a locked phone loses nothing.
*/

const STORAGE_KEY = "gym-app";

function emptyDB() {
  return { version: 1, logs: [], sessions: [], machineSettings: {}, current: null };
}

function loadDB() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyDB();
    // Merge with an empty DB so any field added in a later version exists.
    return { ...emptyDB(), ...JSON.parse(text) };
  } catch (error) {
    console.error("Could not read saved data", error);
    return emptyDB();
  }
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

// Which routine to suggest: the one after the last completed workout (A → B → A ...).
function nextRoutineId() {
  const done = DB.sessions.filter((s) => s.completed);
  if (done.length === 0) return ROUTINES[0].id;
  const last = done[done.length - 1];
  const index = ROUTINES.findIndex((r) => r.id === last.routineId);
  return ROUTINES[(index + 1) % ROUTINES.length].id;
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
