/*
  PROGRESS: streaks, a calendar of workout days, recent workouts, and per-exercise
  progress (a chart of your heaviest set, personal bests and history).

  Everything here is worked out from what's already saved (DB.logs and
  DB.sessions), so nothing new is stored.
*/

// A week (Monday to Sunday) counts towards your streak with this many workouts.
const STREAK_WORKOUTS_PER_WEEK = 2;

// Which month the calendar shows (changes with ‹ ›).
let calendarMonth = new Date();

// ---------- Working things out from the history ----------

// Workouts you actually did: finished ones, plus ones ended early that have sets.
function trainedSessions() {
  return DB.sessions.filter(
    (s) => s.completed || DB.logs.some((log) => log.sessionId === s.id)
  );
}

// "2026-10-28" → "2026-10-26", the Monday of that week.
function weekStart(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return todayISO(date);
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

// Current and longest run of weeks with enough workouts. The current week
// only counts once you've reached the goal, but being short this week doesn't
// break the streak until the week is over.
function weekStreaks() {
  const perWeek = {};
  for (const s of trainedSessions()) perWeek[weekStart(s.date)] = (perWeek[weekStart(s.date)] || 0) + 1;
  const good = (week) => (perWeek[week] || 0) >= STREAK_WORKOUTS_PER_WEEK;

  const thisWeek = weekStart(todayISO());
  let current = 0;
  let week = good(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  while (good(week)) {
    current++;
    week = addDays(week, -7);
  }

  let longest = 0;
  let run = 0;
  const weeks = Object.keys(perWeek).sort();
  if (weeks.length) {
    for (let w = weeks[0]; w <= thisWeek; w = addDays(w, 7)) {
      run = good(w) ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  return { current, longest, thisWeek: perWeek[thisWeek] || 0 };
}

// Every workout an exercise was done in, oldest first:
// [{ date, sessionId, sets: [...], top: the best set }]
function exerciseHistory(exerciseId) {
  const bySession = {};
  for (const log of DB.logs) {
    if (log.exerciseId !== exerciseId || !(log.reps || log.seconds)) continue;
    (bySession[log.sessionId] ||= []).push(log);
  }
  return Object.values(bySession)
    .map((sets) => {
      sets.sort((a, b) => a.set - b.set);
      const top = sets.reduce(betterSet);
      return { date: sets[0].date, at: sets[0].at, sessionId: sets[0].sessionId, sets, top };
    })
    .sort((a, b) => a.at - b.at);
}

// Which of two sets is better: cardio → longer; otherwise heavier, then more reps.
function betterSet(a, b) {
  if (a.seconds || b.seconds) return (b.seconds ?? 0) > (a.seconds ?? 0) ? b : a;
  return (b.weightKg ?? 0) > (a.weightKg ?? 0) ||
    ((b.weightKg ?? 0) === (a.weightKg ?? 0) && b.reps > a.reps) ? b : a;
}

// Your best ever for an exercise (from exerciseHistory), or null.
function bestOf(history) {
  return history.length ? history.map((h) => h.top).reduce(betterSet) : null;
}

// "40 kg × 12", "12 reps" or, for cardio, "12 min · level 6"
function setText(log) {
  if (log.seconds) return cardioText(log);
  return log.weightKg != null ? `${log.weightKg} kg × ${log.reps}` : `${log.reps} reps`;
}

// ---------- The Progress tab ----------

function renderProgress() {
  const sessions = trainedSessions();
  const streaks = weekStreaks();

  if (sessions.length === 0) {
    showScreen(`
      ${progressHeader()}
      <section class="card empty-state">
        ${icon("chart")}
        <p><strong>Nothing here yet.</strong> Finish a workout and your calendar, streaks
        and progress per exercise show up here.</p>
      </section>
      ${tabBar("progress")}
    `);
    return;
  }

  // Exercises you've done with sets, most recently done first.
  const done = [...new Set([...DB.logs].filter((l) => l.reps || l.seconds).sort((a, b) => b.at - a.at).map((l) => l.exerciseId))];
  const exerciseRows = done.map((id) => {
    const ex = getExercise(id);
    const history = exerciseHistory(id);
    const best = bestOf(history);
    return `
      <li>
        <button class="list-row" data-action="open-exercise-progress" data-id="${id}">
          ${exerciseImage(id, "row-thumb")}
          <span class="row-text">
            <span class="row-title">${esc(ex.name)}</span>
            <span class="row-sub">Best: ${setText(best)} · ${history.length}× done</span>
          </span>
          ${icon("chevron-right")}
        </button>
      </li>`;
  }).join("");

  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8).map((s) => {
    const sets = DB.logs.filter((l) => l.sessionId === s.id && l.reps).length;
    const cardioMin = Math.round(DB.logs.filter((l) => l.sessionId === s.id && l.seconds)
      .reduce((sum, l) => sum + l.seconds, 0) / 60);
    const minutes = Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));
    const what = [sets ? `${sets} sets` : "", cardioMin ? `${cardioMin} min cardio` : ""].filter(Boolean).join(" · ") || "No sets";
    return `
      <li>
        <button class="list-row" data-action="open-session" data-id="${s.id}">
          <span class="date-badge"><strong>${Number(s.date.slice(8))}</strong>
            ${new Date(s.date + "T12:00").toLocaleDateString("en-GB", { month: "short" })}</span>
          <span class="row-text">
            <span class="row-title">${esc(getWorkout(s.workoutId)?.name ?? s.workoutName ?? "Workout")}</span>
            <span class="row-sub">${what} · ${minutes} min total${s.completed ? "" : " · ended early"}</span>
          </span>
          ${icon("chevron-right")}
        </button>
      </li>`;
  }).join("");

  showScreen(`
    ${progressHeader()}

    <div class="stat-grid">
      <div class="stat"><span class="eyebrow">Streak</span>
        <strong>${streaks.current} wk${streaks.current === 1 ? "" : "s"}</strong></div>
      <div class="stat"><span class="eyebrow">This week</span>
        <strong>${streaks.thisWeek} of ${STREAK_WORKOUTS_PER_WEEK}</strong></div>
      <div class="stat"><span class="eyebrow">Workouts</span><strong>${sessions.length}</strong></div>
    </div>
    <p class="row-sub center streak-note">A week counts towards your streak with
      ${STREAK_WORKOUTS_PER_WEEK}+ workouts. Longest: ${streaks.longest} week${streaks.longest === 1 ? "" : "s"}.</p>

    ${calendarCard(sessions)}

    <h2 class="section-title">Exercises</h2>
    <ul class="row-list">${exerciseRows}</ul>

    <h2 class="section-title">Recent workouts</h2>
    <ul class="row-list">${recent}</ul>

    ${tabBar("progress")}
  `);
}

function progressHeader() {
  return `
    <header class="home-header">
      <div>
        <p class="eyebrow">Your training</p>
        <h1 class="big-title">Progress</h1>
      </div>
    </header>`;
}

// A month grid (Monday first). Days you trained are filled; tap one to see it.
function calendarCard(sessions) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7; // empty cells before the 1st
  const today = todayISO();
  const byDay = {};
  for (const s of sessions) (byDay[s.date] ||= []).push(s);

  let cells = "";
  for (let i = 0; i < blanks; i++) cells += `<span></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = todayISO(new Date(year, month, d));
    const trained = byDay[iso];
    const classes = ["cal-day", trained ? "trained" : "", iso === today ? "today" : ""].join(" ");
    cells += trained
      ? `<button class="${classes}" data-action="open-day" data-id="${iso}"
           aria-label="${formatDate(iso)}: ${trained.length} workout${trained.length > 1 ? "s" : ""}">${d}</button>`
      : `<span class="${classes}">${d}</span>`;
  }

  const thisMonth = new Date();
  const atThisMonth = year === thisMonth.getFullYear() && month === thisMonth.getMonth();
  const label = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return `
    <section class="card calendar">
      <div class="cal-head">
        <button class="icon-btn" data-action="cal-move" data-id="-1" aria-label="Previous month">${icon("chevron-left")}</button>
        <strong>${label}</strong>
        <button class="icon-btn" data-action="cal-move" data-id="1" aria-label="Next month"
          ${atThisMonth ? "disabled" : ""}>${icon("chevron-right")}</button>
      </div>
      <div class="cal-grid">
        ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="cal-dow">${d}</span>`).join("")}
        ${cells}
      </div>
    </section>`;
}

function moveCalendar(months) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + months, 1);
  renderProgress();
}

// ---------- One workout (from the calendar or the list) ----------

function showSession(sessionId) {
  const s = DB.sessions.find((x) => x.id === sessionId);
  const logs = DB.logs.filter((l) => l.sessionId === sessionId);
  const minutes = Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));

  // Group the sets by exercise, in the order you did them.
  const order = [...new Set([...logs].sort((a, b) => a.at - b.at).map((l) => l.exerciseId))];
  const rows = order.map((id) => {
    const sets = logs.filter((l) => l.exerciseId === id).sort((a, b) => a.set - b.set);
    const text = sets[0].seconds ? formatDuration(sets[0].seconds) : sets.map(setText).join(" · ");
    return `
      <li class="list-row static">
        ${exerciseImage(id, "row-thumb")}
        <span class="row-text">
          <span class="row-title">${esc(getExercise(id).name)}</span>
          <span class="row-sub">${esc(text)}</span>
        </span>
      </li>`;
  }).join("");

  const name = getWorkout(s.workoutId)?.name ?? s.workoutName ?? "Workout";
  openSheet(name, `
    <p class="muted center sheet-intro">${formatDate(s.date)} · ${minutes} min${s.completed ? "" : " · ended early"}</p>
    <div class="sheet-list"><ul class="row-list">${rows || `<li class="muted center">No sets saved.</li>`}</ul></div>
    <button class="danger-btn wide-btn" data-pick="delete">${icon("trash")} Delete this workout</button>`,
    () => {
      const sets = logs.filter((l) => l.reps || l.seconds).length;
      if (!confirm(`Delete ${name} on ${formatDate(s.date)} and its ${sets} set${sets === 1 ? "" : "s"}? ` +
        "This can't be undone.")) return true; // keep the sheet open
      deleteSession(sessionId);
      // Redraw whichever screen is showing (the Progress tab or an exercise's page).
      const [render, args] = screenStack[screenStack.length - 1] || [renderProgress, []];
      render(...args);
    });
}

// Remove one workout and all its sets. "Last time", charts, bests and streaks are
// all worked out from what's saved, so they correct themselves.
function deleteSession(sessionId) {
  DB.sessions = DB.sessions.filter((s) => s.id !== sessionId);
  DB.logs = DB.logs.filter((l) => l.sessionId !== sessionId);
  saveDB();
}

// A day in the calendar: one workout opens straight away; more than one, the latest.
function showDay(iso) {
  const sessions = trainedSessions().filter((s) => s.date === iso).sort((a, b) => b.startedAt - a.startedAt);
  if (sessions.length) showSession(sessions[0].id);
}

// ---------- One exercise: chart, personal bests, history ----------

function renderExerciseProgress(exerciseId) {
  const ex = getExercise(exerciseId);
  const history = exerciseHistory(exerciseId);
  const cardio = ex.type === "cardio";
  const weighted = !cardio && history.some((h) => h.top.weightKg != null);
  const allSets = history.flatMap((h) => h.sets);
  const mode = cardio ? "min" : weighted ? "kg" : "reps";

  // Personal bests.
  const heaviest = allSets.reduce((b, s) => ((s.weightKg ?? 0) > (b.weightKg ?? 0) ? s : b), allSets[0]);
  const mostReps = allSets.reduce((b, s) => (s.reps > b.reps ? s : b), allSets[0]);
  const bestSet = allSets.reduce((b, s) => ((s.weightKg ?? 0) * s.reps > (b.weightKg ?? 0) * b.reps ? s : b), allSets[0]);
  const longest = allSets.reduce((b, s) => ((s.seconds ?? 0) > (b.seconds ?? 0) ? s : b), allSets[0]);
  const farthest = allSets.reduce((b, s) => ((s.cardio?.distance ?? 0) > (b.cardio?.distance ?? 0) ? s : b), allSets[0]);
  const bests = cardio ? [
    ["Longest", formatDuration(Math.round(longest.seconds / 60) * 60 || longest.seconds), formatDate(longest.date)],
    ...(farthest.cardio?.distance ? [["Farthest", `${farthest.cardio.distance} km`, formatDate(farthest.date)]] : []),
    ["Done", `${history.length}×`, `since ${formatDate(history[0].date).slice(4)}`],
  ] : weighted ? [
    ["Heaviest", `${heaviest.weightKg} kg`, `× ${heaviest.reps} · ${formatDate(heaviest.date)}`],
    ["Best set", `${bestSet.weightKg}×${bestSet.reps}`, `${Math.round(bestSet.weightKg * bestSet.reps)} kg moved`],
    ["Done", `${history.length}×`, `since ${formatDate(history[0].date).slice(4)}`],
  ] : [
    ["Most reps", `${mostReps.reps}`, formatDate(mostReps.date)],
    ["Done", `${history.length}×`, `since ${formatDate(history[0].date).slice(4)}`],
  ];

  const historyRows = [...history].reverse().map((h) => `
    <li class="list-row static">
      <span class="date-badge"><strong>${Number(h.date.slice(8))}</strong>
        ${new Date(h.date + "T12:00").toLocaleDateString("en-GB", { month: "short" })}</span>
      <span class="row-text">
        <span class="row-title">${esc(setText(h.top))}</span>
        <span class="row-sub">${h.sets.map(setText).join(" · ")}</span>
      </span>
    </li>`).join("");

  showScreen(`
    ${topbar(ex.name)}

    <div class="stat-grid ${bests.length === 2 ? "two" : ""} pb-grid">
      ${bests.map(([label, value, sub]) => `
        <div class="stat"><span class="eyebrow">${label}</span><strong>${value}</strong>
          <span class="row-sub">${esc(sub)}</span></div>`).join("")}
    </div>

    <h2 class="section-title">${{ kg: "Heaviest set per workout (kg)", reps: "Most reps per workout", min: "Minutes per workout" }[mode]}</h2>
    <section class="card chart-card">
      ${progressChart(history, mode)}
    </section>

    <h2 class="section-title">History</h2>
    <ul class="row-list">${historyRows}</ul>
  `);
}

// A simple line chart: one point per workout (the heaviest set, or most reps).
// Tap (or hover) a point to read it; the latest is shown to start with.
// mode: "kg" (heaviest set), "reps" (most reps) or "min" (cardio minutes).
function progressChart(history, mode) {
  const values = history.map((h) =>
    mode === "kg" ? h.top.weightKg ?? 0 : mode === "min" ? Math.round(h.top.seconds / 6) / 10 : h.top.reps);
  const W = 320, H = 170, left = 36, right = 14, top = 14, bottom = 26;

  // Y axis: from a round number below the lowest to one above the highest.
  const lo = Math.min(...values), hi = Math.max(...values);
  const tick = niceStep((hi - lo) / 3 || Math.max(1, hi / 4));
  const yMin = Math.max(0, Math.floor(lo / tick) * tick - (hi === lo ? tick : 0));
  const yMax = Math.ceil(hi / tick) * tick + (hi === lo ? tick : 0);
  const x = (i) => history.length === 1 ? (left + W - right) / 2
    : left + (i / (history.length - 1)) * (W - left - right);
  const y = (v) => top + (1 - (v - yMin) / (yMax - yMin)) * (H - top - bottom);

  const grid = [];
  for (let v = yMin; v <= yMax + 1e-9; v += tick) {
    grid.push(`<line class="chart-grid" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="chart-axis" x="${left - 6}" y="${y(v) + 4}" text-anchor="end">${roundKg(v)}</text>`);
  }
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const points = values.map((v, i) => `
    <g class="chart-point ${i === values.length - 1 ? "active" : ""}" data-chart-point="${i}">
      <circle class="chart-hit" cx="${x(i)}" cy="${y(v)}" r="16"/>
      <circle class="chart-dot" cx="${x(i)}" cy="${y(v)}" r="4.5"/>
    </g>`).join("");
  const first = history[0], last = history[history.length - 1];

  // Readouts for each point, used by the tap/hover handler in js/app.js.
  const readouts = history.map((h) => `${formatDate(h.date)} · ${setText(h.top)}`);

  return `
    <p class="chart-readout" data-readouts='${esc(JSON.stringify(readouts))}'>${esc(readouts[readouts.length - 1])}</p>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${history.length} workouts, from ${values[0]} to ${values[values.length - 1]} ${mode}">
      ${grid.join("")}
      ${history.length > 1 ? `<path class="chart-line" d="${line}"/>` : ""}
      ${points}
      <text class="chart-axis" x="${x(0)}" y="${H - 6}" text-anchor="${history.length > 1 ? "start" : "middle"}">${formatDate(first.date).slice(4)}</text>
      ${history.length > 1 ? `<text class="chart-axis" x="${x(history.length - 1)}" y="${H - 6}" text-anchor="end">${formatDate(last.date).slice(4)}</text>` : ""}
    </svg>
    ${history.length === 1 ? `<p class="row-sub center">One workout so far. The line starts next time.</p>` : ""}`;
}

// A round step for the axis: 1, 2, 2.5, 5, 10, 20, 25, 50 ...
function niceStep(raw) {
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= raw) return m * power;
  return 10 * power;
}

// Tap or hover a point: show its date and best set above the chart.
function showChartPoint(el) {
  const card = el.closest(".chart-card");
  const readout = card.querySelector(".chart-readout");
  const texts = JSON.parse(readout.dataset.readouts);
  readout.textContent = texts[Number(el.dataset.chartPoint)];
  card.querySelectorAll(".chart-point").forEach((p) => p.classList.toggle("active", p === el));
}
