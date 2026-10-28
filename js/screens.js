/*
  SCREENS: shared helpers, Home, and Workout detail.
  Each render function builds the screen's HTML as text and puts it on the page.
  Buttons carry a data-action="..." attribute; js/app.js listens for taps and
  decides what each action does.
*/

const appEl = document.getElementById("app");

function showScreen(html) {
  appEl.innerHTML = html;
  window.scrollTo(0, 0);
}

// ---------- Shared helpers ----------

// Make text safe to put inside HTML (so a "<" in a note can't break the page).
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || { id, name: id, cue: "", howTo: "", type: "reps" };
}

function getRoutine(id) {
  return ROUTINES.find((r) => r.id === id);
}

// The exercise illustration. Falls back to a placeholder if there's no image yet.
function exerciseImage(id, className) {
  return `<img class="${className}" src="img/exercises/${id}.jpg" alt=""
    onerror="this.onerror=null; this.src='img/placeholder.svg'">`;
}

// "3 × 8–12", "2 × 8 each side" or "5 min".
function targetText(step) {
  if (step.seconds) return formatDuration(step.seconds);
  const [min, max] = step.reps;
  const reps = min === max ? `${min}` : `${min}–${max}`;
  return `${step.sets} × ${reps}${step.eachSide ? " each side" : ""}`;
}

function formatDuration(seconds) {
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return formatClock(seconds);
}

// 95 → "1:35"
function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Rough length of a routine: ~40 s per set plus rest, rounded to 5 minutes.
function estimateMinutes(routine) {
  let seconds = 0;
  for (const step of routine.steps) {
    if (step.seconds) {
      seconds += step.seconds;
    } else {
      const sets = step.sets + (step.warmUp ? 1 : 0);
      seconds += sets * (40 + (step.rest ?? routine.rest));
    }
  }
  return Math.round(seconds / 60 / 5) * 5;
}

// "2026-10-26" → "Mon 26 Oct"
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// ---------- Home ----------

function renderHome() {
  const now = new Date();
  const dateLine = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const nextId = nextRoutineId();
  const last = lastSession();

  // The suggested workout goes first, the others follow (swipe sideways).
  const ordered = [getRoutine(nextId), ...ROUTINES.filter((r) => r.id !== nextId)];

  const cards = ordered.map((routine) => `
    <button class="routine-card" data-action="open-routine" data-id="${routine.id}">
      <span class="eyebrow">${routine.id === nextId ? "Up next · " : ""}About ${estimateMinutes(routine)} min</span>
      <span class="card-title">${esc(routine.name)}</span>
      <span class="thumb-grid">
        ${routine.steps.map((step) => exerciseImage(step.exercise, "thumb")).join("")}
      </span>
    </button>`).join("");

  showScreen(`
    <header class="home-header">
      <div>
        <p class="eyebrow">${esc(dateLine)}</p>
        <h1 class="big-title">${esc(weekday)}</h1>
      </div>
      <span class="chip" title="Workouts this week">
        ${icon("circle-check")} ${workoutsThisWeek()} this week
      </span>
    </header>

    <section class="carousel">${cards}</section>

    <p class="muted center last-line">
      ${last
        ? `${icon("history")} Last workout: ${esc(getRoutine(last.routineId)?.name)}, ${formatDate(last.date)}`
        : "Your first workout. You've got this."}
    </p>
  `);
}

// ---------- Workout detail ----------

function renderDetail(routineId) {
  const routine = getRoutine(routineId);

  const rows = routine.steps.map((step) => {
    const ex = getExercise(step.exercise);
    return `
      <li class="step-row">
        ${exerciseImage(ex.id, "step-thumb")}
        <span class="step-name">${esc(ex.name)}</span>
        <span class="step-target">${targetText(step)}</span>
      </li>`;
  }).join("");

  showScreen(`
    <header class="topbar">
      <button class="icon-btn" data-action="home" aria-label="Close">${icon("x")}</button>
      <h1>${esc(routine.name)}</h1>
      <span class="icon-btn"></span>
    </header>

    <section class="detail-intro">
      <p class="eyebrow center">${routine.steps.length} exercises · About ${estimateMinutes(routine)} min</p>
      <p class="center">${esc(routine.description)}</p>
    </section>

    <ul class="step-list">${rows}</ul>

    <div class="bottom-bar">
      <button class="primary-btn" data-action="start" data-id="${routine.id}">Start workout</button>
    </div>
  `);
}
