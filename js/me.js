/*
  ME: a summary of your saved data, your account, and clean up.

  Your data is saved in this browser on this device, and (when signed in) in your
  account too: see js/sync.js. "Clean up" is folded away at the bottom: it deletes
  history (Start fresh) or everything (Delete everything).

  Backup files were removed on 2026-11-12: the account does that job now.
  mergeData() below is what was left of "Load a backup"; sync uses it.
*/

function renderMe(message = "") {
  const done = DB.sessions.filter((s) => s.completed);
  const sets = DB.logs.filter((log) => log.reps).length;
  const first = DB.sessions[0]?.date;
  const alsoAccount = isSignedIn() ? " The copy in your account is replaced too." : "";

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

    <!-- Folded away: tap "Clean up" to open. Rarely needed, so it stays quiet. -->
    <details class="cleanup">
      <summary>Clean up</summary>
      <section class="card">
        <button class="secondary-btn danger-outline" data-action="start-fresh" ${DB.logs.length || DB.sessions.length ? "" : "disabled"}>
          ${icon("history")} Start fresh</button>
        <p class="row-sub">Deletes all workouts and sets. Keeps your own workouts and notes.${alsoAccount}</p>
        <button class="danger-btn" data-action="delete-everything">${icon("trash")} Delete everything</button>
        <p class="row-sub">Wipes all app data on this device.${alsoAccount}</p>
      </section>
    </details>

    ${tabBar("me")}
  `);
}

// ---------- Clean up ----------

function startFresh() {
  const workouts = DB.sessions.length;
  const sets = DB.logs.length;
  if (!confirm(`Delete all ${workouts} workout${workouts === 1 ? "" : "s"} and ${sets} set${sets === 1 ? "" : "s"}? ` +
    "Your own workouts, machine settings, weight steps and notes stay.")) return;
  DB.logs = [];
  DB.sessions = [];
  DB.current = null;
  saveDB();
  renderMe("History cleared. A fresh start.");
}

function deleteEverything() {
  if (!confirm("Delete ALL app data: history, your own workouts, settings and " +
    "notes? This can't be undone.")) return;
  Object.assign(DB, emptyDB());
  saveDB();
  renderMe("Everything deleted. The app is like new.");
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
