/*
  PLAYER: the workout itself, one exercise per screen.

  The workout in progress lives in DB.current and is saved after every change:
    { sessionId, workoutId, startedAt,
      step,         which step of the workout is on screen (0 = first)
      warmUps,      { stepIndex: true } for ticked warm-up sets
      drafts,       numbers typed but not ticked yet: { "step-set": { weight, reps } }
      timer,        timed exercise: { remainingMs, endsAt (null when paused), done }
      rest }        rest countdown: { endsAt (null when paused), remainingMs, totalMs,
                                      advance, nextLabel } or null

  Timers store the moment they END (a timestamp), not a count. So if the phone
  locks for a minute, the countdown is still right when you come back.

  The line around the picture shows progress:
    resting → the rest time left, timed exercise → the time left,
    otherwise → how many sets you've ticked.
*/

// ---------- Starting and finishing ----------

function startWorkout(workoutId) {
  DB.current = {
    sessionId: newId(),
    workoutId,
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
    workoutId: cur.workoutId,
    date: todayISO(),
    startedAt: cur.startedAt,
    finishedAt: Date.now(),
    completed,
  });
  DB.current = null;
  saveDB();
  return cur;
}

// ---------- Small questions about the current step ----------

function currentStep() {
  return getWorkout(DB.current.workoutId).steps[DB.current.step];
}

function setsDone(step) {
  return setsThisSession(DB.current.sessionId, step.exercise).length;
}

function stepFinished(step) {
  if (step.seconds) return Boolean(DB.current.timer?.done);
  return setsDone(step) >= step.sets;
}

// Milliseconds left on a countdown that may be running or paused.
function msLeft(clock) {
  return clock.endsAt ? clock.endsAt - Date.now() : clock.remainingMs;
}

// How full the line around the picture is, from 0 to 1.
function ringFraction(step) {
  const cur = DB.current;
  if (cur.rest) return Math.max(0, msLeft(cur.rest) / cur.rest.totalMs);
  if (step.seconds) {
    if (!cur.timer || cur.timer.done) return 1;
    return Math.max(0, msLeft(cur.timer) / (step.seconds * 1000));
  }
  return setsDone(step) / step.sets;
}

// ---------- The exercise screen ----------

function renderPlayer(keepScroll = false) {
  const cur = DB.current;
  const workout = getWorkout(cur.workoutId);
  const step = currentStep();
  const ex = getExercise(step.exercise);

  if (step.seconds && !cur.timer) {
    cur.timer = { remainingMs: step.seconds * 1000, endsAt: null, done: false };
  }
  const body = step.seconds ? timedBlock() : setsBlock(step, ex);

  showScreen(`
    <header class="topbar">
      <button class="icon-btn" data-action="quit" aria-label="End workout">${icon("x")}</button>
      <h1>${cur.step + 1} of ${workout.steps.length}</h1>
      <span class="icon-btn"></span>
    </header>
    <div class="progress"><span style="width:${(cur.step / workout.steps.length) * 100}%"></span></div>

    <section class="player">
      <div class="art-wrap ${cur.rest ? "resting" : ""}">
        ${exerciseImage(ex.id, "player-art")}
        <!-- The progress line around the picture, starting at the top centre and
             going clockwise. pathLength="100" lets us say "draw 40% of the line"
             with stroke-dashoffset = 60. -->
        <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
          <rect class="ring-track" x="2" y="2" width="96" height="96" rx="17" pathLength="100"/>
          <path class="ring-fill" data-ring pathLength="100"
            d="M50 2 H81 A17 17 0 0 1 98 19 V81 A17 17 0 0 1 81 98 H19 A17 17 0 0 1 2 81 V19 A17 17 0 0 1 19 2 Z"
            style="stroke-dashoffset:${100 - ringFraction(step) * 100}"/>
        </svg>
      </div>
      <h2 class="exercise-name">${esc(ex.name)}</h2>
      <p class="target">${targetText(step)}</p>
      <p class="cue">${esc(ex.cue)}</p>
      <details class="howto">
        <summary>How to ${icon("chevron-down")}</summary>
        <p>${esc(ex.howTo)}</p>
      </details>
      ${body}
    </section>

    ${controlDock(step, cur.step === workout.steps.length - 1)}
  `, keepScroll);
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

// Timed exercises (the bike): a big countdown. Start/pause is the middle button below.
function timedBlock() {
  const t = DB.current.timer;
  return `
    <p class="countdown ${t.done ? "finished" : ""}" data-countdown="timer">
      ${t.done ? "Done" : formatClock(msLeft(t) / 1000)}
    </p>
    ${t.done || t.endsAt ? "" : `<p class="muted">Tap ${icon("play")} to start</p>`}`;
}

// The bar fixed at the bottom: rest controls (while resting) and ⏮ ▶ ⏭.
function controlDock(step, isLast) {
  const cur = DB.current;
  const rest = cur.rest;

  // The middle button changes with what's happening.
  let middle;
  if (rest) {
    middle = `<button class="round-btn big" data-action="toggle-rest" aria-label="${rest.endsAt ? "Pause rest" : "Carry on resting"}">
      ${icon(rest.endsAt ? "pause" : "play")}</button>`;
  } else if (step.seconds && !cur.timer.done) {
    middle = `<button class="round-btn big" data-action="toggle-timer" aria-label="${cur.timer.endsAt ? "Pause" : "Start"}">
      ${icon(cur.timer.endsAt ? "pause" : "play")}</button>`;
  } else {
    // All sets done → a green tick that moves on. Not done yet → greyed out.
    const ready = stepFinished(step);
    middle = `<button class="round-btn big ${ready ? "go" : ""}" data-action="next" ${ready ? "" : "disabled"}
      aria-label="${isLast ? "Finish workout" : "Next exercise"}">${icon("check")}</button>`;
  }

  const restRow = rest ? `
    <div class="rest-row">
      <div>
        <p class="eyebrow">Rest${rest.endsAt ? "" : " · paused"}</p>
        <p class="rest-clock" data-countdown="rest">${formatClock(msLeft(rest) / 1000)}</p>
        <p class="row-sub">Next: ${esc(rest.nextLabel)}</p>
      </div>
      <div class="rest-buttons">
        <button class="small-btn" data-action="rest-adjust" data-seconds="-15">−15</button>
        <button class="small-btn" data-action="rest-adjust" data-seconds="15">+15</button>
        <button class="small-btn" data-action="rest-skip">Skip</button>
      </div>
    </div>` : "";

  return `
    <nav class="dock ${rest ? "with-rest" : ""}">
      ${restRow}
      <div class="controls">
        <button class="round-btn" data-action="prev" ${cur.step === 0 ? "disabled" : ""} aria-label="Previous exercise">
          ${icon("skip-back")}</button>
        ${middle}
        <button class="round-btn" data-action="next" aria-label="${isLast ? "Finish workout" : "Skip to next exercise"}">
          ${icon(isLast ? "flag" : "skip-forward")}</button>
      </div>
    </nav>`;
}

// ---------- Rest between sets ----------

function startRest(step, setNumber) {
  const workout = getWorkout(DB.current.workoutId);
  const seconds = step.rest ?? workout.rest;
  const lastSet = setNumber >= step.sets;
  const nextStep = workout.steps[DB.current.step + 1];

  // After the final set of the final exercise there's nothing to rest for.
  if (lastSet && !nextStep) return;

  DB.current.rest = {
    endsAt: Date.now() + seconds * 1000,
    remainingMs: seconds * 1000,
    totalMs: seconds * 1000,
    advance: lastSet, // when this rest ends, move on to the next exercise
    nextLabel: lastSet ? getExercise(nextStep.exercise).name : `set ${setNumber + 1} of ${step.sets}`,
  };
}

function endRest() {
  const rest = DB.current.rest;
  DB.current.rest = null;
  if (rest.advance) {
    goToStep(+1);
  } else {
    saveDB();
    renderPlayer(true);
  }
}

function toggleRest() {
  const rest = DB.current.rest;
  if (rest.endsAt) {
    rest.remainingMs = rest.endsAt - Date.now(); // pause
    rest.endsAt = null;
  } else {
    rest.endsAt = Date.now() + rest.remainingMs; // carry on
  }
  saveDB();
  renderPlayer(true);
}

function adjustRest(seconds) {
  const rest = DB.current.rest;
  const change = seconds * 1000;
  if (rest.endsAt) rest.endsAt += change;
  else rest.remainingMs += change;
  rest.totalMs = Math.max(rest.totalMs + change, 1000);
  saveDB();
  tickClock();
}

// ---------- The clock: runs 4 times a second and updates what's on screen ----------

function tickClock() {
  const cur = DB.current;
  if (!cur) return;
  const step = currentStep();

  if (cur.rest) {
    const left = msLeft(cur.rest);
    if (left <= 0) {
      playDing();
      flashScreen();
      endRest();
      return;
    }
    const el = document.querySelector('[data-countdown="rest"]');
    if (el) el.textContent = formatClock(left / 1000);
  }

  if (cur.timer && cur.timer.endsAt) {
    const left = cur.timer.endsAt - Date.now();
    if (left <= 0) {
      cur.timer = { remainingMs: 0, endsAt: null, done: true };
      logTimed();
      saveDB();
      playDing();
      flashScreen();
      renderPlayer(true);
      return;
    }
    const el = document.querySelector('[data-countdown="timer"]');
    if (el) el.textContent = formatClock(left / 1000);
  }

  const ring = document.querySelector("[data-ring]");
  if (ring) ring.style.strokeDashoffset = 100 - ringFraction(step) * 100;
}

// A finished timed exercise is saved too, so stats can count it later.
function logTimed() {
  const cur = DB.current;
  const step = currentStep();
  DB.logs.push({
    id: newId(), sessionId: cur.sessionId, workoutId: cur.workoutId,
    exerciseId: step.exercise, set: 1, weightKg: null, reps: null,
    seconds: step.seconds, date: todayISO(), at: Date.now(),
  });
}

// ---------- Actions (called from js/app.js when you tap) ----------

function toggleSet(setNumber) {
  const cur = DB.current;
  const step = currentStep();
  const already = DB.logs.find(
    (log) => log.sessionId === cur.sessionId && log.exerciseId === step.exercise && log.set === setNumber
  );

  if (already) {
    // Tapping a ticked set un-ticks it (and removes it from the history).
    DB.logs = DB.logs.filter((log) => log !== already);
    cur.drafts[`${cur.step}-${setNumber}`] = { weight: already.weightKg ?? "", reps: already.reps };
    saveDB();
    renderPlayer(true);
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
    id: newId(), sessionId: cur.sessionId, workoutId: cur.workoutId,
    exerciseId: step.exercise, set: setNumber,
    weightKg: Number.isFinite(weight) ? weight : null,
    reps, seconds: null, date: todayISO(), at: Date.now(),
  });
  delete cur.drafts[`${cur.step}-${setNumber}`];
  startRest(step, setNumber);
  saveDB();
  renderPlayer(true);
}

function toggleWarmUp() {
  const cur = DB.current;
  cur.warmUps[cur.step] = !cur.warmUps[cur.step];
  saveDB();
  renderPlayer(true);
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
  renderPlayer(true);
}

// Move to another exercise (+1 next/skip, -1 back). Past the last one = finished.
function goToStep(delta) {
  const cur = DB.current;
  const workout = getWorkout(cur.workoutId);
  const target = cur.step + delta;

  if (target >= workout.steps.length) {
    renderDone(finishWorkout(true));
    return;
  }
  if (target < 0) return;

  cur.step = target;
  cur.rest = null;
  cur.timer = null; // a fresh timer for the new step...
  const step = workout.steps[target];
  if (step.seconds && setsDone(step) > 0) {
    cur.timer = { remainingMs: 0, endsAt: null, done: true }; // ...unless it's already done
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
  goHome();
}

// ---------- Done ----------

function renderDone(session) {
  const workout = getWorkout(session.workoutId);
  const logs = DB.logs.filter((log) => log.sessionId === session.sessionId);
  const repLogs = logs.filter((log) => log.reps);
  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const kg = repLogs.reduce((sum, log) => sum + (log.weightKg || 0) * log.reps, 0);

  // Exercises with nothing ticked count as skipped.
  const skipped = workout.steps
    .filter((step) => !logs.some((log) => log.exerciseId === step.exercise))
    .map((step) => getExercise(step.exercise).name);

  showScreen(`
    <section class="done-screen">
      <span class="done-icon">${icon("circle-check")}</span>
      <h1 class="big-title">Done!</h1>
      <p class="muted">${esc(workout.name)} is finished. Nice work.</p>

      <div class="stat-grid">
        <div class="stat"><span class="eyebrow">Time</span><strong>${minutes} min</strong></div>
        <div class="stat"><span class="eyebrow">Sets</span><strong>${repLogs.length}</strong></div>
        <div class="stat"><span class="eyebrow">Lifted</span><strong>${Math.round(kg)} kg</strong></div>
      </div>
      ${skipped.length ? `<p class="muted skipped">Skipped: ${skipped.map(esc).join(", ")}</p>` : ""}
    </section>
    <div class="bottom-bar">
      <button class="primary-btn" data-action="home">Back to home</button>
    </div>
  `);
}
