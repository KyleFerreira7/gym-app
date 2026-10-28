/*
  PLAYER: the workout itself, one exercise per screen.

  The workout in progress lives in DB.current and is saved after every change:
    { sessionId, routineId, startedAt,
      step,         which step of the routine is on screen (0 = first)
      warmUps,      { stepIndex: true } for ticked warm-up sets
      drafts,       numbers typed but not ticked yet: { "step-set": { weight, reps } }
      timer,        timed exercise: { remainingMs, endsAt (null when paused), done }
      rest }        rest countdown: { endsAt, totalMs, advance } or null

  Timers store the moment they END (a timestamp), not a count. So if the phone
  locks for a minute, the countdown is still right when you come back.
*/

// ---------- Starting and finishing ----------

function startWorkout(routineId) {
  DB.current = {
    sessionId: newId(),
    routineId,
    startedAt: Date.now(),
    step: 0,
    warmUps: {},
    drafts: {},
    timer: null,
    rest: null,
  };
  saveDB();
  renderPlayer();
}

function finishWorkout(completed) {
  const cur = DB.current;
  DB.sessions.push({
    id: cur.sessionId,
    routineId: cur.routineId,
    date: todayISO(),
    startedAt: cur.startedAt,
    finishedAt: Date.now(),
    completed,
  });
  DB.current = null;
  saveDB();
  return cur;
}

// ---------- The exercise screen ----------

function renderPlayer() {
  const cur = DB.current;
  const routine = getRoutine(cur.routineId);
  const step = routine.steps[cur.step];
  const ex = getExercise(step.exercise);
  const isLast = cur.step === routine.steps.length - 1;

  const body = step.seconds ? timedBlock(step) : setsBlock(step, ex);

  showScreen(`
    <header class="topbar">
      <button class="icon-btn" data-action="quit" aria-label="End workout">${icon("x")}</button>
      <h1>${cur.step + 1} of ${routine.steps.length}</h1>
      <span class="icon-btn"></span>
    </header>
    <div class="progress"><span style="width:${(cur.step / routine.steps.length) * 100}%"></span></div>

    <section class="player">
      ${exerciseImage(ex.id, "player-art")}
      <h2 class="exercise-name">${esc(ex.name)}</h2>
      <p class="target">${targetText(step)}</p>
      <p class="cue">${esc(ex.cue)}</p>
      <details class="howto">
        <summary>How to ${icon("chevron-down")}</summary>
        <p>${esc(ex.howTo)}</p>
      </details>
      ${body}
    </section>

    <nav class="player-nav">
      <button class="secondary-btn" data-action="prev" ${cur.step === 0 ? "disabled" : ""}>
        ${icon("chevron-left")} Back
      </button>
      <button class="primary-btn" data-action="next">
        ${isLast ? "Finish" : "Next"} ${icon("chevron-right")}
      </button>
    </nav>

    ${cur.rest ? restOverlay() : ""}
  `);
}

// Sets × reps exercises: last time, machine settings, and one row per set.
function setsBlock(step, ex) {
  const cur = DB.current;
  const last = lastTimeFor(ex.id, cur.sessionId);
  const done = setsThisSession(cur.sessionId, ex.id);
  const usesWeight = ex.equipment !== "mat";   // bodyweight exercises: reps only
  const usesSettings = ex.equipment === "machine" || ex.equipment === "cable";

  // "Last time (Mon 26 Oct): 40 kg × 12 · 40 kg × 11"
  let lastLine = "First time: pick a weight that feels light, and see how it goes.";
  if (last) {
    const sets = last.sets
      .map((s) => (s.weightKg != null ? `${s.weightKg} kg × ${s.reps}` : `${s.reps} reps`))
      .join(" · ");
    lastLine = `<strong>Last time</strong> (${formatDate(last.date)}): ${sets}`;
  }

  const settings = usesSettings ? `
    <label class="field">
      <span>Machine settings</span>
      <input type="text" data-field="settings" data-exercise="${ex.id}"
        value="${esc(DB.machineSettings[ex.id])}" placeholder="e.g. seat 4, back pad 2">
    </label>` : "";

  const warmUp = step.warmUp ? `
    <div class="set-row warmup ${cur.warmUps[cur.step] ? "done" : ""}">
      <span class="set-num">W</span>
      <span class="set-label">Light warm-up set</span>
      <button class="tick" data-action="toggle-warmup" aria-label="Warm-up set done">${icon("check")}</button>
    </div>` : "";

  let rows = "";
  for (let n = 1; n <= step.sets; n++) {
    const logged = done.find((log) => log.set === n);
    // What to show in the boxes: what you ticked, else what you typed, else last time's
    // numbers, else (for the weight) the set you just did today.
    const draft = cur.drafts[`${cur.step}-${n}`] || {};
    const prev = last?.sets.find((s) => s.set === n) || last?.sets[last.sets.length - 1];
    const earlierToday = done.filter((log) => log.set < n).sort((a, b) => b.set - a.set)[0];
    const weight = logged ? logged.weightKg
      : draft.weight ?? prev?.weightKg ?? earlierToday?.weightKg ?? "";
    const reps = logged ? logged.reps : draft.reps ?? prev?.reps ?? "";

    rows += `
      <div class="set-row ${logged ? "done" : ""}">
        <span class="set-num">${n}</span>
        ${usesWeight ? `
          <label class="num-input">
            <input type="text" inputmode="decimal" data-field="weight" data-set="${n}"
              value="${esc(weight)}" placeholder="–" ${logged ? "disabled" : ""}>
            <span>kg</span>
          </label>` : ""}
        <label class="num-input">
          <input type="text" inputmode="numeric" data-field="reps" data-set="${n}"
            value="${esc(reps)}" placeholder="–" ${logged ? "disabled" : ""}>
          <span>reps</span>
        </label>
        <button class="tick" data-action="toggle-set" data-set="${n}" aria-label="Set ${n} done">
          ${icon("check")}
        </button>
      </div>`;
  }

  return `
    <p class="last-time">${lastLine}</p>
    ${settings}
    <div class="sets">${warmUp}${rows}</div>`;
}

// Timed exercises (the bike): a big countdown with start/pause.
function timedBlock(step) {
  const cur = DB.current;
  if (!cur.timer) cur.timer = { remainingMs: step.seconds * 1000, endsAt: null, done: false };
  const t = cur.timer;
  const running = t.endsAt !== null;
  const remaining = running ? (t.endsAt - Date.now()) / 1000 : t.remainingMs / 1000;

  return `
    <p class="countdown ${t.done ? "finished" : ""}" data-countdown="timer">
      ${t.done ? "Done" : formatClock(remaining)}
    </p>
    ${t.done ? "" : `
      <button class="round-btn" data-action="toggle-timer" aria-label="${running ? "Pause" : "Start"}">
        ${icon(running ? "pause" : "play")}
      </button>`}`;
}

// ---------- Rest between sets ----------

function restOverlay() {
  const rest = DB.current.rest;
  const remaining = (rest.endsAt - Date.now()) / 1000;
  return `
    <div class="rest-overlay">
      <p class="eyebrow">Rest</p>
      <p class="countdown" data-countdown="rest">${formatClock(remaining)}</p>
      <div class="rest-bar"><span data-rest-bar></span></div>
      <p class="muted">Up next: ${esc(rest.nextLabel)}</p>
      <div class="rest-buttons">
        <button class="secondary-btn" data-action="rest-adjust" data-seconds="-15">−15 s</button>
        <button class="secondary-btn" data-action="rest-adjust" data-seconds="15">+15 s</button>
      </div>
      <button class="primary-btn" data-action="rest-skip">Skip rest</button>
    </div>`;
}

function startRest(step, setNumber) {
  const routine = getRoutine(DB.current.routineId);
  const seconds = step.rest ?? routine.rest;
  const lastSet = setNumber >= step.sets;
  const nextStep = routine.steps[DB.current.step + 1];

  // After the final set of the final exercise there's nothing to rest for.
  if (lastSet && !nextStep) return;

  DB.current.rest = {
    endsAt: Date.now() + seconds * 1000,
    totalMs: seconds * 1000,
    advance: lastSet, // when this rest ends, move on to the next exercise
    nextLabel: lastSet ? getExercise(nextStep.exercise).name : `Set ${setNumber + 1} of ${step.sets}`,
  };
}

function endRest() {
  const rest = DB.current.rest;
  DB.current.rest = null;
  if (rest.advance) DB.current.step += 1;
  saveDB();
  renderPlayer();
}

// ---------- The clock: runs 4 times a second and updates any countdown on screen ----------

function tickClock() {
  const cur = DB.current;
  if (!cur) return;

  if (cur.rest) {
    const remainingMs = cur.rest.endsAt - Date.now();
    if (remainingMs <= 0) {
      playDing();
      flashScreen();
      endRest();
      return;
    }
    const el = document.querySelector('[data-countdown="rest"]');
    if (el) el.textContent = formatClock(remainingMs / 1000);
    const bar = document.querySelector("[data-rest-bar]");
    if (bar) bar.style.width = `${(remainingMs / cur.rest.totalMs) * 100}%`;
  }

  if (cur.timer && cur.timer.endsAt) {
    const remainingMs = cur.timer.endsAt - Date.now();
    if (remainingMs <= 0) {
      cur.timer = { remainingMs: 0, endsAt: null, done: true };
      logTimed();
      saveDB();
      playDing();
      flashScreen();
      renderPlayer();
      return;
    }
    const el = document.querySelector('[data-countdown="timer"]');
    if (el) el.textContent = formatClock(remainingMs / 1000);
  }
}

// A finished timed exercise is saved too, so stats can count it later.
function logTimed() {
  const cur = DB.current;
  const step = getRoutine(cur.routineId).steps[cur.step];
  DB.logs.push({
    id: newId(), sessionId: cur.sessionId, routineId: cur.routineId,
    exerciseId: step.exercise, set: 1, weightKg: null, reps: null,
    seconds: step.seconds, date: todayISO(), at: Date.now(),
  });
}

// ---------- Actions (called from js/app.js when you tap) ----------

function toggleSet(setNumber) {
  const cur = DB.current;
  const step = getRoutine(cur.routineId).steps[cur.step];
  const already = DB.logs.find(
    (log) => log.sessionId === cur.sessionId && log.exerciseId === step.exercise && log.set === setNumber
  );

  if (already) {
    // Tapping a ticked set un-ticks it (and removes it from the history).
    DB.logs = DB.logs.filter((log) => log !== already);
    cur.drafts[`${cur.step}-${setNumber}`] = { weight: already.weightKg ?? "", reps: already.reps };
    saveDB();
    renderPlayer();
    return;
  }

  // Read the numbers typed in this set's row. Commas work too ("22,5").
  const weightEl = document.querySelector(`[data-field="weight"][data-set="${setNumber}"]`);
  const repsEl = document.querySelector(`[data-field="reps"][data-set="${setNumber}"]`);
  const weight = weightEl ? parseFloat(weightEl.value.replace(",", ".")) : null;
  const reps = parseInt(repsEl.value, 10);

  if (!(reps > 0)) {
    // No reps typed: highlight the box and wait.
    repsEl.classList.add("needs-value");
    repsEl.focus();
    return;
  }

  DB.logs.push({
    id: newId(), sessionId: cur.sessionId, routineId: cur.routineId,
    exerciseId: step.exercise, set: setNumber,
    weightKg: Number.isFinite(weight) ? weight : null,
    reps, seconds: null, date: todayISO(), at: Date.now(),
  });
  delete cur.drafts[`${cur.step}-${setNumber}`];
  startRest(step, setNumber);
  saveDB();
  renderPlayer();
}

function toggleWarmUp() {
  const cur = DB.current;
  cur.warmUps[cur.step] = !cur.warmUps[cur.step];
  saveDB();
  renderPlayer();
}

function toggleTimer() {
  const t = DB.current.timer;
  if (t.endsAt) {
    t.remainingMs = t.endsAt - Date.now(); // pause
    t.endsAt = null;
  } else {
    t.endsAt = Date.now() + t.remainingMs; // start / carry on
  }
  saveDB();
  renderPlayer();
}

function goToStep(delta) {
  const cur = DB.current;
  const routine = getRoutine(cur.routineId);
  const target = cur.step + delta;

  if (target >= routine.steps.length) {
    renderDone(finishWorkout(true));
    return;
  }
  if (target < 0) return;

  cur.step = target;
  cur.rest = null;
  cur.timer = null; // a fresh timer for the new step (a finished one shows as done again below)
  if (routine.steps[target].seconds && setsThisSession(cur.sessionId, routine.steps[target].exercise).length) {
    cur.timer = { remainingMs: 0, endsAt: null, done: true };
  }
  saveDB();
  renderPlayer();
}

function quitWorkout() {
  const hasSets = DB.logs.some((log) => log.sessionId === DB.current.sessionId);
  const message = hasSets
    ? "End this workout now? The sets you ticked are saved."
    : "End this workout? Nothing has been ticked yet.";
  if (!confirm(message)) return;

  if (hasSets) {
    finishWorkout(false);
  } else {
    DB.current = null;
    saveDB();
  }
  renderHome();
}

// ---------- Done ----------

function renderDone(session) {
  const routine = getRoutine(session.routineId);
  const logs = DB.logs.filter((log) => log.sessionId === session.sessionId && log.reps);
  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const kg = logs.reduce((sum, log) => sum + (log.weightKg || 0) * log.reps, 0);

  showScreen(`
    <section class="done-screen">
      <span class="done-icon">${icon("circle-check")}</span>
      <h1 class="big-title">Done!</h1>
      <p class="muted">${esc(routine.name)} is finished. Nice work.</p>

      <div class="stat-grid">
        <div class="stat"><span class="eyebrow">Time</span><strong>${minutes} min</strong></div>
        <div class="stat"><span class="eyebrow">Sets</span><strong>${logs.length}</strong></div>
        <div class="stat"><span class="eyebrow">Lifted</span><strong>${Math.round(kg)} kg</strong></div>
      </div>
    </section>
    <div class="bottom-bar">
      <button class="primary-btn" data-action="home">Back to home</button>
    </div>
  `);
}
