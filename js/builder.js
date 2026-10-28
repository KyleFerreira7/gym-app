/*
  BUILD YOUR OWN WORKOUT

  Pick exercises from the pool, set the sets and reps for each, put them in
  order, name it and save. Saved workouts live in DB.customWorkouts and work
  exactly like the built-in ones (Home, browse, swap, progress, backups).

  While you're editing, the workout is kept in `builderDraft` below; it's only saved
  when you tap "Save workout".
*/

// Rep ranges to cycle through when you tap the reps button.
const REP_CHOICES = [[8, 12], [10, 12], [12, 15], [6, 10], [8, 8], [10, 10], [12, 12]];
const REST_CHOICES = [60, 75, 90, 120];
const BIKE_WARM_UP = { exercise: "bike", seconds: 300 };

let builderDraft = null; // the workout being edited

// ---------- Opening the builder ----------

function startBuilder() {
  builderDraft = { id: null, name: "", rest: 90, bike: true, steps: [] };
  goTo(renderBuilder);
}

function editWorkout(workoutId) {
  const w = getWorkout(workoutId);
  builderDraft = {
    id: w.id,
    name: w.name,
    rest: w.rest,
    bike: w.steps.some((s) => s.exercise === "bike"),
    steps: w.steps.filter((s) => !s.seconds).map((s) => ({ ...s, reps: [...s.reps] })),
  };
  goTo(renderBuilder);
}

// A new exercise's starting sets and reps, by equipment.
function defaultStep(ex) {
  if (ex.equipment === "mat") return { exercise: ex.id, sets: 2, reps: [10, 12], eachSide: Boolean(ex.eachSide) };
  return { exercise: ex.id, sets: 3, reps: [8, 12], warmUp: true };
}

function repsText(reps) {
  return reps[0] === reps[1] ? `${reps[0]}` : `${reps[0]}–${reps[1]}`;
}

// ---------- The builder screen ----------

function renderBuilder(message = "", keepScroll = false) {
  const rows = builderDraft.steps.map((step, i) => {
    const ex = getExercise(step.exercise);
    return `
      <li class="builder-row">
        <div class="builder-top">
          ${exerciseImage(ex.id, "row-thumb")}
          <span class="row-text">
            <span class="row-title">${esc(ex.name)}</span>
            <span class="row-sub">${esc(ex.equipment[0].toUpperCase() + ex.equipment.slice(1))}</span>
          </span>
          <button class="icon-btn" data-action="b-move" data-i="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""}
            aria-label="Move up">${icon("arrow-up")}</button>
          <button class="icon-btn" data-action="b-move" data-i="${i}" data-dir="1" ${i === builderDraft.steps.length - 1 ? "disabled" : ""}
            aria-label="Move down">${icon("arrow-down")}</button>
          <button class="icon-btn" data-action="b-remove" data-i="${i}" aria-label="Remove">${icon("x")}</button>
        </div>
        <div class="builder-controls">
          <span class="mini-stepper">
            <button class="mini-btn" data-action="b-sets" data-i="${i}" data-dir="-1" aria-label="Fewer sets">${icon("minus")}</button>
            <strong>${step.sets} sets</strong>
            <button class="mini-btn" data-action="b-sets" data-i="${i}" data-dir="1" aria-label="More sets">${icon("plus")}</button>
          </span>
          <button class="small-btn" data-action="b-reps" data-i="${i}">
            × ${repsText(step.reps)} reps${step.eachSide ? " each side" : ""}</button>
        </div>
      </li>`;
  }).join("");

  showScreen(`
    ${topbar(builderDraft.id ? "Edit workout" : "Build a workout")}

    <label class="field builder-name">
      <span>Name</span>
      <input type="text" data-field="builder-name" value="${esc(builderDraft.name)}" placeholder="e.g. Saturday arms" maxlength="40">
    </label>

    <button class="toggle-row" data-action="b-bike" aria-pressed="${builderDraft.bike}">
      <span>Start with 5 min on the bike</span>
      <span class="switch ${builderDraft.bike ? "on" : ""}"></span>
    </button>

    <h2 class="section-title">Exercises</h2>
    ${rows ? `<ul class="row-list">${rows}</ul>` : `<p class="muted center">No exercises yet.</p>`}
    <button class="secondary-btn wide-btn" data-action="b-add">${icon("plus")} Add exercises</button>

    <button class="toggle-row" data-action="b-rest">
      <span>Rest between sets</span>
      <strong>${builderDraft.rest} s</strong>
    </button>

    ${message ? `<p class="backup-message">${esc(message)}</p>` : ""}
    ${builderDraft.id ? `<button class="danger-btn wide-btn" data-action="b-delete">${icon("trash")} Delete this workout</button>` : ""}

    <div class="bottom-bar">
      <button class="primary-btn" data-action="b-save">${icon("check")} Save workout</button>
    </div>
  `, keepScroll);
}

// ---------- Changes (from the buttons) ----------

function builderAction(action, el) {
  const i = Number(el.dataset.i);
  const dir = Number(el.dataset.dir);
  const step = builderDraft.steps[i];

  if (action === "b-bike") builderDraft.bike = !builderDraft.bike;
  if (action === "b-rest") builderDraft.rest = REST_CHOICES[(REST_CHOICES.indexOf(builderDraft.rest) + 1) % REST_CHOICES.length];
  if (action === "b-sets") step.sets = Math.min(6, Math.max(1, step.sets + dir));
  if (action === "b-reps") {
    const now = REP_CHOICES.findIndex((r) => r[0] === step.reps[0] && r[1] === step.reps[1]);
    step.reps = [...REP_CHOICES[(now + 1) % REP_CHOICES.length]];
  }
  if (action === "b-remove") builderDraft.steps.splice(i, 1);
  if (action === "b-move") {
    const [moved] = builderDraft.steps.splice(i, 1);
    builderDraft.steps.splice(i + dir, 0, moved);
  }
  if (action === "b-add") return showAddSheet();
  if (action === "b-save") return saveBuiltWorkout();
  if (action === "b-delete") return deleteBuiltWorkout();
  renderBuilder("", true);
}

// The list of exercises to add, grouped by muscle. Tap to add or remove;
// the sheet stays open so you can pick several, then "Done".
function showAddSheet() {
  const chosen = () => new Set(builderDraft.steps.map((s) => s.exercise));
  const row = (ex) => `
    <li>
      <button class="list-row pick-row ${chosen().has(ex.id) ? "picked" : ""}" data-pick="${ex.id}">
        ${exerciseImage(ex.id, "row-thumb")}
        <span class="row-text">
          <span class="row-title">${esc(ex.name)}</span>
          <span class="row-sub">${esc(ex.equipment[0].toUpperCase() + ex.equipment.slice(1))}</span>
        </span>
        <span class="pick-mark">${icon("check")}</span>
      </button>
    </li>`;
  const groups = MUSCLE_GROUPS.map((g) => {
    const list = exercisesInGroup(g).filter((ex) => ex.type === "reps");
    return list.length ? `<h2 class="section-title">${esc(g.name)}</h2><ul class="row-list">${list.map(row).join("")}</ul>` : "";
  }).join("");

  openSheet("Add exercises", `
    <div class="sheet-list">${groups}</div>
    <button class="primary-btn wide-btn sheet-done" data-close>Done</button>`,
    (el) => {
      const id = el.dataset.pick;
      const at = builderDraft.steps.findIndex((s) => s.exercise === id);
      if (at >= 0) builderDraft.steps.splice(at, 1);
      else builderDraft.steps.push(defaultStep(getExercise(id)));
      el.classList.toggle("picked", at < 0);
      return true; // keep the sheet open
    },
    () => renderBuilder("", true));
}

function saveBuiltWorkout() {
  if (builderDraft.steps.length === 0) return renderBuilder("Add at least one exercise first.");
  const workout = {
    id: builderDraft.id || `my-${newId()}`,
    name: builderDraft.name.trim() || "My workout",
    description: "A workout you built yourself.",
    custom: true,
    tags: [],
    rest: builderDraft.rest,
    steps: [...(builderDraft.bike ? [BIKE_WARM_UP] : []), ...builderDraft.steps],
  };
  const at = DB.customWorkouts.findIndex((w) => w.id === workout.id);
  if (at >= 0) DB.customWorkouts[at] = workout;
  else DB.customWorkouts.push(workout);
  saveDB();
  builderDraft = null;

  // Back to Home, then straight into the saved workout.
  goHome();
  goTo(renderDetail, workout.id);
}

function deleteBuiltWorkout() {
  if (DB.current?.workoutId === builderDraft.id) {
    return renderBuilder("This workout is in progress. Finish or end it first.");
  }
  if (!confirm(`Delete "${builderDraft.name || "this workout"}"? Your saved sets stay in your history.`)) return;
  DB.customWorkouts = DB.customWorkouts.filter((w) => w.id !== builderDraft.id);
  saveDB();
  builderDraft = null;
  goHome();
}
