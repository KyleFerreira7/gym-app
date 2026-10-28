/*
  SCREENS: shared helpers, Home, and the browse screens
  (plan, muscle group, workout type, workout detail).

  Each render function builds the screen's HTML as text and puts it on the page.
  Buttons carry a data-action="..." attribute; js/app.js listens for taps and
  decides what each action does.
*/

const appEl = document.getElementById("app");

// keepScroll: redraw without jumping back to the top (used while ticking sets).
function showScreen(html, keepScroll = false) {
  const y = window.scrollY;
  appEl.innerHTML = html;
  window.scrollTo(0, keepScroll ? y : 0);
}

// ---------- Going back ----------
// A small list of the screens you came through, so "back" returns to the
// right place (e.g. Home → Legs → Workout A → back → Legs).

const screenStack = [];

function goTo(render, ...args) {
  screenStack.push([render, args]);
  render(...args);
}

function goBack() {
  screenStack.pop();
  const previous = screenStack[screenStack.length - 1];
  if (previous) previous[0](...previous[1]);
  else goHome();
}

function goHome() {
  letScreenSleep();
  screenStack.length = 0;
  screenStack.push([renderHome, []]);
  renderHome();
}

function goMe() {
  screenStack.length = 0;
  screenStack.push([renderMe, []]);
  renderMe();
}

// ---------- Shared helpers ----------

// Make text safe to put inside HTML (so a "<" in a note can't break the page).
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || { id, name: id, cue: "", howTo: "", type: "reps", muscles: [] };
}

function getWorkout(id) {
  return WORKOUTS.find((w) => w.id === id);
}

function getPlan(id) {
  return PLANS.find((p) => p.id === id);
}

// The exercise illustration. Falls back to a placeholder if there's no image yet.
function exerciseImage(id, className) {
  return `<img class="${className}" src="img/exercises/${id}.jpg" alt=""
    onerror="this.onerror=null; this.src='img/placeholder.svg'">`;
}

// The picture that represents a workout: its first exercise after the warm-up.
function workoutImageId(workout) {
  const main = workout.steps.find((s) => !s.seconds) || workout.steps[0];
  return main.exercise;
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

// Rough length of a workout: ~40 s per set plus rest, rounded to 5 minutes.
function estimateMinutes(workout) {
  let seconds = 0;
  for (const step of workout.steps) {
    if (step.seconds) {
      seconds += step.seconds;
    } else {
      const sets = step.sets + (step.warmUp ? 1 : 0);
      seconds += sets * (40 + (step.rest ?? workout.rest));
    }
  }
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

// "2026-10-26" → "Mon 26 Oct"
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// Which group of MUSCLE_GROUPS an exercise belongs to (by its main muscle).
function inMuscleGroup(exercise, group) {
  return group.muscles.includes(exercise.muscles?.[0]);
}

function exercisesInGroup(group) {
  return EXERCISES.filter((ex) => inMuscleGroup(ex, group));
}

// Workouts with at least one exercise whose main muscle is in this group,
// the ones with the most such exercises first (so "Legs" tops the Legs list).
function workoutsForGroup(group) {
  const count = (w) => w.steps.filter((step) => inMuscleGroup(getExercise(step.exercise), group)).length;
  return WORKOUTS.filter((w) => count(w) > 0).sort((a, b) => count(b) - count(a));
}

function workoutsOfType(type) {
  return WORKOUTS.filter((w) => (w.tags || []).includes(type.id));
}

// A tappable row for a workout, used on the browse screens.
function workoutRow(workout) {
  return `
    <li>
      <button class="list-row" data-action="open-workout" data-id="${workout.id}">
        ${exerciseImage(workoutImageId(workout), "row-thumb")}
        <span class="row-text">
          <span class="row-title">${esc(workout.name)}</span>
          <span class="row-sub">${workout.steps.length} exercises · About ${estimateMinutes(workout)} min</span>
        </span>
        ${icon("chevron-right")}
      </button>
    </li>`;
}

// A square tile with a picture and a name ("Browse by ...").
function tile(action, id, imageId, name) {
  return `
    <button class="tile" data-action="${action}" data-id="${id}">
      ${exerciseImage(imageId, "tile-img")}
      <span>${esc(name)}</span>
    </button>`;
}

// The tab bar at the bottom of the main screens (Home and Me).
function tabBar(active) {
  const tab = (id, label, iconName) => `
    <button class="tab ${active === id ? "active" : ""}" data-action="tab" data-id="${id}"
      ${active === id ? 'aria-current="page"' : ""}>
      ${icon(iconName)}<span>${label}</span>
    </button>`;
  return `<nav class="tab-bar">${tab("home", "Home", "house")}${tab("me", "Me", "user")}</nav>`;
}

// ---------- Exercise info (the (i) button) ----------
// A sheet that slides up over the workout with the picture and numbered steps.
// It sits outside the main screen, so timers carry on underneath and a redraw
// of the workout (e.g. when rest ends) doesn't close it.

function showInfo(exerciseId) {
  const ex = getExercise(exerciseId);
  // The how-to text, one sentence per numbered step.
  const steps = ex.howTo.split(/(?<=\.)\s+/).filter(Boolean);

  const sheet = document.createElement("div");
  sheet.className = "info-sheet";
  sheet.innerHTML = `
    <div class="info-backdrop" data-close></div>
    <section class="info-panel" role="dialog" aria-modal="true" aria-label="${esc(ex.name)}">
      <header class="topbar">
        <span class="icon-btn"></span>
        <h1>${esc(ex.name)}</h1>
        <button class="icon-btn" data-close aria-label="Close">${icon("x")}</button>
      </header>
      ${exerciseImage(ex.id, "info-art")}
      <p class="cue">${esc(ex.cue)}</p>
      <ol class="info-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    </section>`;

  const close = () => {
    sheet.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (event) => { if (event.key === "Escape") close(); };
  sheet.addEventListener("click", (event) => { if (event.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(sheet);
}

// The bar at the top of the browse screens.
function topbar(title, closeAction = "back") {
  return `
    <header class="topbar">
      <button class="icon-btn" data-action="${closeAction}" aria-label="Back">
        ${icon(closeAction === "back" ? "chevron-left" : "x")}
      </button>
      <h1>${esc(title)}</h1>
      <span class="icon-btn"></span>
    </header>`;
}

// ---------- Home ----------

function renderHome() {
  const now = new Date();
  const dateLine = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const plan = activePlan();
  const nextId = nextWorkoutId();
  const last = lastSession();

  // The active plan's workouts, starting from the suggested one (swipe sideways).
  const start = plan.workouts.indexOf(nextId);
  const ordered = [...plan.workouts.slice(start), ...plan.workouts.slice(0, start)].map(getWorkout);

  const cards = ordered.map((workout) => `
    <button class="workout-card" data-action="open-workout" data-id="${workout.id}">
      <span class="eyebrow">${workout.id === nextId ? "Up next · " : ""}About ${estimateMinutes(workout)} min</span>
      <span class="card-title">${esc(workout.name)}</span>
      <span class="thumb-grid">
        ${workout.steps.slice(0, 6).map((step) => exerciseImage(step.exercise, "thumb")).join("")}
      </span>
    </button>`).join("");

  const planCards = PLANS.map((p) => `
    <button class="plan-card ${p.id === plan.id ? "active" : ""}" data-action="open-plan" data-id="${p.id}">
      <span class="eyebrow">${p.id === plan.id ? `${icon("check")} Following` : `${p.workouts.length} workouts`}</span>
      <span class="plan-name">${esc(p.name)}</span>
      <span class="row-sub">${p.workouts.map((id) => esc(getWorkout(id).name)).join(" · ")}</span>
    </button>`).join("");

  const muscleTiles = MUSCLE_GROUPS
    .filter((g) => exercisesInGroup(g).length > 0)
    .map((g) => tile("open-muscle", g.id, g.image, g.name)).join("");

  const typeTiles = WORKOUT_TYPES
    .filter((t) => workoutsOfType(t).length > 0)
    .map((t) => tile("open-type", t.id, t.image, t.name)).join("");

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
        ? `${icon("history")} Last workout: ${esc(getWorkout(last.workoutId)?.name)}, ${formatDate(last.date)}`
        : "Your first workout. You've got this."}
    </p>

    <h2 class="section-title">Plans</h2>
    <section class="plan-row">${planCards}</section>

    <h2 class="section-title">Browse by muscle</h2>
    <section class="tile-grid three">${muscleTiles}</section>

    <h2 class="section-title">Browse by type</h2>
    <section class="tile-grid two">${typeTiles}</section>

    ${tabBar("home")}
  `);
}

// ---------- Plan ----------

function renderPlan(planId) {
  const plan = getPlan(planId);
  const following = activePlan().id === plan.id;

  showScreen(`
    ${topbar(plan.name)}
    <section class="detail-intro">
      <p class="eyebrow center">${plan.workouts.length} workouts, in rotation</p>
      <p class="center">${esc(plan.description)}</p>
    </section>

    <ul class="row-list">${plan.workouts.map((id) => workoutRow(getWorkout(id))).join("")}</ul>

    <div class="bottom-bar">
      ${following
        ? `<button class="secondary-btn" disabled>${icon("check")} You're following this plan</button>`
        : `<button class="primary-btn" data-action="follow-plan" data-id="${plan.id}">Follow this plan</button>`}
    </div>
  `);
}

// ---------- Muscle group ----------

function renderMuscle(groupId) {
  const group = MUSCLE_GROUPS.find((g) => g.id === groupId);

  // Each exercise with what you lifted last time, so you can see your memory at a glance.
  const exerciseRows = exercisesInGroup(group).map((ex) => {
    const last = lastTimeFor(ex.id);
    const firstSet = last?.sets[0];
    const equipment = ex.equipment[0].toUpperCase() + ex.equipment.slice(1);
    const lastText = firstSet
      ? `${equipment} · Last: ${firstSet.weightKg != null ? `${firstSet.weightKg} kg × ` : ""}${firstSet.reps}`
      : equipment;
    return `
      <li class="list-row static">
        ${exerciseImage(ex.id, "row-thumb")}
        <span class="row-text">
          <span class="row-title">${esc(ex.name)}</span>
          <span class="row-sub">${lastText}</span>
        </span>
      </li>`;
  }).join("");

  showScreen(`
    ${topbar(group.name)}
    <h2 class="section-title">Workouts</h2>
    <ul class="row-list">${workoutsForGroup(group).map(workoutRow).join("")}</ul>
    <h2 class="section-title">Exercises</h2>
    <ul class="row-list">${exerciseRows}</ul>
  `);
}

// ---------- Workout type ----------

function renderType(typeId) {
  const type = WORKOUT_TYPES.find((t) => t.id === typeId);
  showScreen(`
    ${topbar(type.name)}
    <ul class="row-list">${workoutsOfType(type).map(workoutRow).join("")}</ul>
  `);
}

// ---------- Workout detail ----------

function renderDetail(workoutId) {
  const workout = getWorkout(workoutId);
  const plans = PLANS.filter((p) => p.workouts.includes(workout.id)).map((p) => p.name);

  const rows = workout.steps.map((step) => {
    const ex = getExercise(step.exercise);
    return `
      <li class="step-row">
        ${exerciseImage(ex.id, "step-thumb")}
        <span class="step-name">${esc(ex.name)}</span>
        <span class="step-target">${targetText(step)}</span>
      </li>`;
  }).join("");

  showScreen(`
    ${topbar(workout.name)}

    <section class="detail-intro">
      <p class="eyebrow center">${workout.steps.length} exercises · About ${estimateMinutes(workout)} min</p>
      <p class="center">${esc(workout.description)}</p>
      ${plans.length ? `<p class="center row-sub">Part of: ${plans.map(esc).join(", ")}</p>` : ""}
    </section>

    <ul class="step-list">${rows}</ul>

    <div class="bottom-bar">
      <button class="primary-btn" data-action="start" data-id="${workout.id}">Start workout</button>
    </div>
  `);
}
