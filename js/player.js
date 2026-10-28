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

// The plan's progression rule: if you hit the TOP of the rep range on every set
// (e.g. 12 on all 3 sets of 8–12), it's time for one weight step more.
// Only for exercises with a weight, and only when you did all the sets.
function readyToGoUp(sets, step, exercise) {
  if (step.seconds || exercise.equipment === "mat") return false;
  if (sets.length < step.sets) return false;
  return sets.every((s) => s.weightKg != null && s.reps >= step.reps[1]);
}

// ---------- Pre-filled numbers ----------

// How much one tap of − / + changes the weight, per exercise. You can change it
// on the exercise screen ("Step: 5 kg") and it's remembered in DB.weightSteps.
const STEP_OPTIONS = [1, 2, 2.5, 5];
const DEFAULT_STEP = { machine: 5, cable: 2.5, dumbbell: 2 };
// A light weight to start from the first time (change it with − / +).
// An exercise in data/exercises.js can set its own with `startKg: 20`.
const DEFAULT_START = { machine: 20, cable: 10, dumbbell: 4 };

function usesWeight(ex) {
  return ex.equipment !== "mat"; // mat exercises: reps only
}

function weightStep(ex) {
  return DB.weightSteps[ex.id] ?? DEFAULT_STEP[ex.equipment] ?? 2.5;
}

// The set you're about to do: the first one not done yet (null when all are done).
function currentSetNumber(step) {
  const done = setsThisSession(DB.current.sessionId, step.exercise).map((log) => log.set);
  for (let n = 1; n <= step.sets; n++) if (!done.includes(n)) return n;
  return null;
}

// What to pre-fill for set n, and why. In order:
//   1. later sets today: the weight you just used
//   2. last time: the same numbers, or one weight step more if you hit the
//      top of the range on every set (the plan's rule), starting at the bottom of the range
//   3. first time: a light starting weight and the top of the range
function suggestSet(step, ex, n) {
  const today = setsThisSession(DB.current.sessionId, ex.id).sort((a, b) => b.set - a.set)[0];
  const last = lastTimeFor(ex.id, DB.current.sessionId);
  const lastSame = last?.sets.find((s) => s.set === n) || last?.sets[last.sets.length - 1];
  const top = step.reps[1];

  if (!usesWeight(ex)) {
    return { weight: null, reps: today?.reps ?? lastSame?.reps ?? top };
  }
  if (today) {
    return { weight: today.weightKg, reps: lastSame?.reps ?? top };
  }
  if (last && readyToGoUp(last.sets, step, ex)) {
    const heaviest = Math.max(...last.sets.map((s) => s.weightKg));
    return { weight: roundKg(heaviest + weightStep(ex)), reps: step.reps[0], goUpFrom: heaviest };
  }
  if (lastSame) {
    return { weight: lastSame.weightKg, reps: lastSame.reps };
  }
  return { weight: ex.startKg ?? DEFAULT_START[ex.equipment] ?? 5, reps: top, firstTime: true };
}

// The numbers for the set on screen, kept in DB.current.drafts so they survive
// a locked phone. Created from suggestSet() the first time they're needed.
function draftFor(step, ex, n) {
  const key = `${DB.current.step}-${n}`;
  if (!DB.current.drafts[key]) DB.current.drafts[key] = suggestSet(step, ex, n);
  return DB.current.drafts[key];
}

// 42.499999 → 42.5
function roundKg(kg) {
  return Math.round(kg * 100) / 100;
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
  keepScreenAwake(); // no dimming mid-workout

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
      <div class="name-row">
        <h2 class="exercise-name">${esc(ex.name)}</h2>
        <button class="info-btn" data-action="info" data-id="${ex.id}" aria-label="How to do ${esc(ex.name)}">
          ${icon("info")}</button>
      </div>
      <p class="target">${targetText(step)}</p>
      <p class="cue">${esc(ex.cue)}</p>
      ${body}
    </section>

    ${controlDock(step, cur.step === workout.steps.length - 1)}
  `, keepScroll);
}

// Sets × reps exercises: one card for the set you're about to do, with − / +
// steppers, pre-filled. Done sets shrink to chips underneath (tap one to fix it).
function setsBlock(step, ex) {
  const cur = DB.current;
  const last = lastTimeFor(ex.id, cur.sessionId);
  const done = setsThisSession(cur.sessionId, ex.id);
  const n = currentSetNumber(step);
  const usesSettings = ex.equipment === "machine" || ex.equipment === "cable";

  // "Last time (Mon 26 Oct): 40 kg × 12 · 40 kg × 11"
  let lastLine = "First time: the weight is a light guess. Use − and + until it feels right.";
  if (last) {
    const sets = last.sets
      .map((s) => (s.weightKg != null ? `${s.weightKg} kg × ${s.reps}` : `${s.reps} reps`))
      .join(" · ");
    lastLine = `<strong>Last time</strong> (${formatDate(last.date)}): ${sets}`;
  }

  // The card: the current set's steppers, or "all done".
  let card;
  if (n === null) {
    card = `
      <div class="set-card all-done">
        ${icon("circle-check")}
        <p><strong>All ${step.sets} sets done.</strong> Tap ${icon("check")} below for the next exercise.</p>
      </div>`;
  } else {
    const draft = draftFor(step, ex, n);
    const note = draft.goUpFrom != null && done.length === 0 ? `
      <p class="set-note">${icon("trending-up")} Up ${roundKg(draft.weight - draft.goUpFrom)} kg from last time:
        you hit ${step.reps[1]} on every set.</p>` : "";
    card = `
      <div class="set-card">
        <p class="eyebrow">Set ${n} of ${step.sets}${step.eachSide ? " · reps each side" : ""}</p>
        ${note}
        ${usesWeight(ex) ? stepper("weight", draft.weight, "kg", n) : ""}
        ${stepper("reps", draft.reps, "reps", n)}
        ${usesWeight(ex) ? `
          <button class="step-size" data-action="cycle-step" data-exercise="${ex.id}">
            − / + changes the weight by <strong>${weightStep(ex)} kg</strong> · change</button>` : ""}
      </div>`;
  }

  // Chips: warm-up, then one per set (done ✓, current ●, still to do ○).
  const chips = [];
  if (step.warmUp) {
    chips.push(`<button class="chip-set ${cur.warmUps[cur.step] ? "done" : ""}" data-action="toggle-warmup"
      aria-pressed="${Boolean(cur.warmUps[cur.step])}">${cur.warmUps[cur.step] ? icon("check") : ""} Warm-up</button>`);
  }
  for (let s = 1; s <= step.sets; s++) {
    const logged = done.find((log) => log.set === s);
    if (logged) {
      const label = logged.weightKg != null ? `${logged.weightKg}×${logged.reps}` : `${logged.reps} reps`;
      chips.push(`<button class="chip-set done" data-action="edit-set" data-set="${s}"
        aria-label="Set ${s}: ${label}. Tap to change">${icon("check")} ${label}</button>`);
    } else {
      chips.push(`<span class="chip-set ${s === n ? "current" : ""}">Set ${s}</span>`);
    }
  }

  const settings = usesSettings ? `
    <label class="field">
      <span>Machine settings</span>
      <input type="text" data-field="settings" data-exercise="${ex.id}"
        value="${esc(DB.machineSettings[ex.id])}" placeholder="e.g. seat 4, back pad 2">
    </label>` : "";

  return `
    ${card}
    <div class="chip-row">${chips.join("")}</div>
    <p class="last-time">${lastLine}</p>
    ${settings}`;
}

// One − [value] + row. The value is also a box you can tap to type an exact number.
function stepper(field, value, unit, n) {
  return `
    <div class="stepper">
      <button class="step-btn" data-action="adjust" data-field="${field}" data-dir="-1" aria-label="Less ${unit}">−</button>
      <label class="step-value">
        <input type="text" inputmode="${field === "weight" ? "decimal" : "numeric"}"
          data-field="${field}" data-set="${n}" value="${esc(value)}" aria-label="${unit}">
        <span>${unit}</span>
      </label>
      <button class="step-btn" data-action="adjust" data-field="${field}" data-dir="1" aria-label="More ${unit}">+</button>
    </div>`;
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
  } else if (!stepFinished(step)) {
    // The main button while lifting: save this set (with the numbers on screen).
    middle = `<button class="done-set-btn" data-action="done-set">${icon("check")} Done set</button>`;
  } else {
    // All sets done → a green tick that moves on.
    middle = `<button class="round-btn big go" data-action="next"
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

function startRest(step) {
  const workout = getWorkout(DB.current.workoutId);
  const seconds = step.rest ?? workout.rest;
  const nextSet = currentSetNumber(step);
  const lastSet = nextSet === null; // that was the final set of this exercise
  const nextStep = workout.steps[DB.current.step + 1];

  // After the final set of the final exercise there's nothing to rest for.
  if (lastSet && !nextStep) return;

  DB.current.rest = {
    endsAt: Date.now() + seconds * 1000,
    remainingMs: seconds * 1000,
    totalMs: seconds * 1000,
    advance: lastSet, // when this rest ends, move on to the next exercise
    nextLabel: lastSet ? getExercise(nextStep.exercise).name : `set ${nextSet} of ${step.sets}`,
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

// "Done set": save the set on screen with its numbers, then rest.
function doneSet() {
  const cur = DB.current;
  const step = currentStep();
  const ex = getExercise(step.exercise);
  const n = currentSetNumber(step);
  if (n === null) return;

  const draft = draftFor(step, ex, n);
  const weight = usesWeight(ex) ? parseFloat(String(draft.weight).replace(",", ".")) : null;
  const reps = parseInt(draft.reps, 10);
  if (!(reps > 0)) {
    // No reps: highlight the box and wait.
    const repsEl = document.querySelector('.set-card input[data-field="reps"]');
    repsEl?.classList.add("needs-value");
    repsEl?.focus();
    return;
  }

  DB.logs.push({
    id: newId(), sessionId: cur.sessionId, workoutId: cur.workoutId,
    exerciseId: step.exercise, set: n,
    weightKg: Number.isFinite(weight) ? weight : null,
    reps, seconds: null, date: todayISO(), at: Date.now(),
  });
  delete cur.drafts[`${cur.step}-${n}`];
  startRest(step);
  saveDB();
  renderPlayer(true);
}

// Tapping a done set's chip takes it back, so you can fix its numbers.
function editSet(setNumber) {
  const cur = DB.current;
  const step = currentStep();
  const logged = DB.logs.find(
    (log) => log.sessionId === cur.sessionId && log.exerciseId === step.exercise && log.set === setNumber
  );
  if (!logged) return;
  DB.logs = DB.logs.filter((log) => log !== logged);
  cur.drafts[`${cur.step}-${setNumber}`] = { weight: logged.weightKg, reps: logged.reps };
  cur.rest = null;
  saveDB();
  renderPlayer(true);
}

// − / + on the set card. Changes the number in place (no redraw), so holding
// the button down to repeat stays smooth.
function adjustValue(field, dir) {
  const step = currentStep();
  const ex = getExercise(step.exercise);
  const n = currentSetNumber(step);
  if (n === null) return;
  const draft = draftFor(step, ex, n);

  if (field === "weight") {
    const now = parseFloat(String(draft.weight).replace(",", ".")) || 0;
    draft.weight = Math.max(0, roundKg(now + dir * weightStep(ex)));
  } else {
    const now = parseInt(draft.reps, 10) || 0;
    draft.reps = Math.min(99, Math.max(1, now + dir));
  }
  saveDB();

  const input = document.querySelector(`.set-card input[data-field="${field}"]`);
  if (input) {
    input.value = draft[field];
    input.classList.remove("needs-value");
  }
}

// "change" next to the step size: 1 → 2 → 2.5 → 5 → 1 kg ...
function cycleWeightStep(exerciseId) {
  const ex = getExercise(exerciseId);
  const index = STEP_OPTIONS.indexOf(weightStep(ex));
  DB.weightSteps[exerciseId] = STEP_OPTIONS[(index + 1) % STEP_OPTIONS.length];
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
  letScreenSleep();
  const workout = getWorkout(session.workoutId);
  const logs = DB.logs.filter((log) => log.sessionId === session.sessionId);
  const repLogs = logs.filter((log) => log.reps);
  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const kg = repLogs.reduce((sum, log) => sum + (log.weightKg || 0) * log.reps, 0);

  // Exercises where today's sets all hit the top of the range: go up next time.
  const goUp = workout.steps
    .filter((step) => readyToGoUp(logs.filter((l) => l.exerciseId === step.exercise), step, getExercise(step.exercise)))
    .map((step) => getExercise(step.exercise).name);

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
      ${goUp.length ? `
        <div class="nudge done-nudge">
          ${icon("trending-up")}
          <p><strong>Go up next time:</strong> ${goUp.map(esc).join(", ")}</p>
        </div>` : ""}
      ${skipped.length ? `<p class="muted skipped">Skipped: ${skipped.map(esc).join(", ")}</p>` : ""}
    </section>
    <div class="bottom-bar">
      <button class="primary-btn" data-action="home">Back to home</button>
    </div>
  `);
}
