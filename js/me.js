/*
  ME: a summary of your saved data, plus backup.

  Your data lives only in this browser on this device. "Back up my data" saves
  all of it to a file (gym-backup-YYYY-MM-DD.json) that you keep somewhere safe
  (iCloud Drive, email it to yourself...). "Load a backup" reads such a file back.

  Loading MERGES: anything in the file that isn't here yet is added, and
  nothing already here is deleted or changed. So loading the same backup twice,
  or an older one, is always safe.
*/

const BACKUP_REMINDER_DAYS = 14;

function renderMe(message = "") {
  const done = DB.sessions.filter((s) => s.completed);
  const sets = DB.logs.filter((log) => log.reps).length;
  const first = DB.sessions[0]?.date;

  // How long since the last backup, and whether it's time for another.
  const daysSince = DB.lastBackupAt ? Math.floor((Date.now() - DB.lastBackupAt) / 86400000) : null;
  const due = DB.logs.length > 0 && (daysSince === null || daysSince >= BACKUP_REMINDER_DAYS);
  let lastBackup = "Never backed up";
  if (daysSince === 0) lastBackup = "Last backup: today";
  else if (daysSince === 1) lastBackup = "Last backup: yesterday";
  else if (daysSince !== null) lastBackup = `Last backup: ${daysSince} days ago`;

  showScreen(`
    <header class="home-header">
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

    <h2 class="section-title">Backup</h2>
    <section class="card">
      <p>Your workouts are saved on this device only. Back up now and then, so nothing
      is lost if the browser's data gets cleared.</p>
      <p class="backup-status ${due ? "due" : ""}">${lastBackup}</p>
      ${message ? `<p class="backup-message">${esc(message)}</p>` : ""}
      <button class="primary-btn" data-action="export">${icon("download")} Back up my data</button>
      <label class="secondary-btn file-btn">
        ${icon("upload")} Load a backup
        <input type="file" accept=".json,application/json" data-field="import">
      </label>
      <p class="row-sub">Loading a backup only adds what's missing. It never deletes anything here.</p>
    </section>

    ${tabBar("me")}
  `);
}

// ---------- Export ----------

async function exportData() {
  const backup = {
    app: "gym-app",
    exportedAt: new Date().toISOString(),
    data: { ...DB, current: null }, // a workout in progress isn't worth saving
  };
  const name = `gym-backup-${todayISO()}.json`;
  const file = new File([JSON.stringify(backup, null, 2)], name, { type: "application/json" });

  try {
    if (navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
      // Phones: open the share sheet ("Save to Files", AirDrop, Mail...).
      await navigator.share({ files: [file], title: "Gym backup" });
    } else {
      // Computers: a normal download to the Downloads folder.
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
  } catch (error) {
    if (error.name === "AbortError") return renderMe("Backup cancelled.");
    console.error(error);
    return renderMe("Couldn't save the backup. Please try again.");
  }

  DB.lastBackupAt = Date.now();
  saveDB();
  renderMe(`Saved ${name}. Keep it somewhere safe, like iCloud Drive.`);
}

// ---------- Import ----------

async function importData(file) {
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch (error) {
    return renderMe("That file isn't a backup from this app.");
  }
  if (backup?.app !== "gym-app" || !Array.isArray(backup.data?.logs)) {
    return renderMe("That file isn't a backup from this app.");
  }

  // Bring an older backup up to date, then add only what's missing.
  const data = upgrade({ ...emptyDB(), ...backup.data });
  const haveLogs = new Set(DB.logs.map((log) => log.id));
  const haveSessions = new Set(DB.sessions.map((s) => s.id));
  const newLogs = data.logs.filter((log) => !haveLogs.has(log.id));
  const newSessions = data.sessions.filter((s) => !haveSessions.has(s.id));

  DB.logs.push(...newLogs);
  DB.sessions.push(...newSessions);
  // Keep everything in time order, so "last time" and "up next" stay right.
  DB.logs.sort((a, b) => a.at - b.at);
  DB.sessions.sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));

  // Machine settings and weight steps: fill in any exercise that has none here yet.
  for (const [exerciseId, note] of Object.entries(data.machineSettings || {})) {
    if (!DB.machineSettings[exerciseId]) DB.machineSettings[exerciseId] = note;
  }
  for (const [exerciseId, kg] of Object.entries(data.weightSteps || {})) {
    if (DB.weightSteps[exerciseId] == null) DB.weightSteps[exerciseId] = kg;
  }
  saveDB();

  const date = backup.exportedAt ? formatDate(todayISO(new Date(backup.exportedAt))) : "an older date";
  if (newLogs.length === 0 && newSessions.length === 0) {
    return renderMe(`Backup from ${date} loaded: everything in it was already here.`);
  }
  const workouts = newSessions.filter((s) => s.completed).length;
  renderMe(`Backup from ${date} loaded: added ${workouts} workout${workouts === 1 ? "" : "s"} and ` +
    `${newLogs.length} set${newLogs.length === 1 ? "" : "s"}.`);
}
