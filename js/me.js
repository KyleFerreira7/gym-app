/*
  ME: a summary of your saved data, and your account.

  Your data is saved in this browser on this device, and (when signed in) in your
  account too: see js/sync.js.

  Removed 2026-11-12: backup files (the account does that job now) and Clean up
  (Start fresh / Delete everything). Single workouts can still be deleted from the
  Progress tab. mergeData() below is what was left of "Load a backup"; sync uses it.
*/

function renderMe(message = "") {
  const done = DB.sessions.filter((s) => s.completed);
  const sets = DB.logs.filter((log) => log.reps).length;
  const first = DB.sessions[0]?.date;

  showScreen(`
    <header class="home-header" data-screen="me">
      <div>
        <p class="eyebrow">Your data</p>
        <h1 class="big-title">Me</h1>
      </div>
    </header>

    <div class="stat-grid me-stats">
      <div class="stat"><span class="eyebrow">Workouts</span><strong>${done.length}</strong></div>
      <div class="stat"><span class="eyebrow">Sets</span><strong>${sets}</strong></div>
      <div class="stat"><span class="eyebrow">Since</span><strong>${first ? formatDate(first).slice(4) : "–"}</strong></div>
    </div>

    ${message ? `<p class="backup-message">${esc(message)}</p>` : ""}

    <h2 class="section-title">Account</h2>
    ${accountCard()}

    ${tabBar("me")}
  `);
}

// ---------- Merging saved data ----------

// Add saved data (from your account) to this device: only what's missing is
// added, nothing here is deleted or changed. Used by js/sync.js.
function mergeData(saved) {
  // Bring older data up to date first.
  const data = upgrade({ ...emptyDB(), ...saved });
  const haveLogs = new Set(DB.logs.map((log) => log.id));
  const haveSessions = new Set(DB.sessions.map((s) => s.id));
  const newLogs = data.logs.filter((log) => !haveLogs.has(log.id));
  const newSessions = data.sessions.filter((s) => !haveSessions.has(s.id));

  DB.logs.push(...newLogs);
  DB.sessions.push(...newSessions);
  // Keep everything in time order, so "last time" and "up next" stay right.
  DB.logs.sort((a, b) => a.at - b.at);
  DB.sessions.sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));

  // Machine settings, locations and weight steps: fill in any exercise that has none here yet.
  for (const [exerciseId, note] of Object.entries(data.machineSettings || {})) {
    if (!DB.machineSettings[exerciseId]) DB.machineSettings[exerciseId] = note;
  }
  // My own workouts: add any that aren't here yet.
  const haveWorkouts = new Set(DB.customWorkouts.map((w) => w.id));
  DB.customWorkouts.push(...(data.customWorkouts || []).filter((w) => !haveWorkouts.has(w.id)));

  for (const [exerciseId, note] of Object.entries(data.locations || {})) {
    if (!DB.locations[exerciseId]) DB.locations[exerciseId] = note;
  }
  for (const [exerciseId, kg] of Object.entries(data.weightSteps || {})) {
    if (DB.weightSteps[exerciseId] == null) DB.weightSteps[exerciseId] = kg;
  }
  saveDB();
  return { newLogs, newSessions };
}
