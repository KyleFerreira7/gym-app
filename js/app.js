/*
  APP: starts everything and handles taps and typing.

  Instead of attaching a handler to every button, there's one listener for the
  whole page. When you tap, it finds the nearest element with data-action="..."
  and runs the matching function. This keeps working when screens are redrawn.
*/

appEl.addEventListener("click", (event) => {
  unlockSound(); // iPhones only allow sound after a tap

  // A point on a progress chart: show what it was.
  const point = event.target.closest("[data-chart-point]");
  if (point) return showChartPoint(point);

  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const id = el.dataset.id;

  switch (el.dataset.action) {
    // Browsing
    case "home":           return goHome();
    case "tab":            return id === "me" ? goMe() : id === "progress" ? goProgress() : goHome();

    // Progress
    case "cal-move":       return moveCalendar(Number(id));
    case "open-day":       return showDay(id);
    case "open-session":   return showSession(id);
    case "open-exercise-progress": return goTo(renderExerciseProgress, id);
    case "export":         return exportData();
    case "back":           return goBack();
    case "open-workout":   return goTo(renderDetail, id);
    case "open-plan":      return goTo(renderPlan, id);
    case "open-muscle":    return goTo(renderMuscle, id);
    case "open-type":      return goTo(renderType, id);
    case "follow-plan":
      DB.activePlanId = id;
      saveDB();
      return goHome();

    // During a workout
    case "start":          return startWorkout(id);
    case "quit":           return quitWorkout();
    case "next":           return goToStep(+1);
    case "prev":           return goToStep(-1);
    case "info":           return showInfo(id);
    case "swap":           return showSwapSheet();
    case "done-set":       return doneSet();
    case "edit-set":       return editSet(Number(el.dataset.set));
    case "cycle-step":     return cycleWeightStep(el.dataset.exercise);
    case "adjust":
      // Taps and holds are handled on "pointerdown" below; this is for keyboards.
      if (event.detail === 0) adjustValue(el.dataset.field, Number(el.dataset.dir));
      return;
    case "toggle-warmup":  return toggleWarmUp();
    case "toggle-timer":   return toggleTimer();
    case "toggle-rest":    return toggleRest();
    case "rest-skip":      return endRest();
    case "rest-adjust":    return adjustRest(Number(el.dataset.seconds));
  }
});

// Typing: remember numbers as you type them, and save machine settings.
appEl.addEventListener("input", (event) => {
  const el = event.target;
  const field = el.dataset.field;
  if (!field || field === "import") return;

  if (field === "settings") {
    DB.machineSettings[el.dataset.exercise] = el.value.trim();
  } else if (field === "location") {
    DB.locations[el.dataset.exercise] = el.value.trim();
  } else if (DB.current) {
    const key = `${DB.current.step}-${el.dataset.set}`;
    DB.current.drafts[key] = { ...DB.current.drafts[key], [field]: el.value };
    el.classList.remove("needs-value");
  }
  saveDB();
});

// − / + buttons: change once straight away, then keep going while held down
// (after a short pause), like holding a key.
let holdTimer = null;
appEl.addEventListener("pointerdown", (event) => {
  const el = event.target.closest('[data-action="adjust"]');
  if (!el) return;
  event.preventDefault(); // no text selection or keyboard popping up
  unlockSound();
  const field = el.dataset.field;
  const dir = Number(el.dataset.dir);
  adjustValue(field, dir);
  const repeat = () => {
    adjustValue(field, dir);
    holdTimer = setTimeout(repeat, 130);
  };
  holdTimer = setTimeout(repeat, 450);
});
const stopHold = () => clearTimeout(holdTimer);
["pointerup", "pointercancel", "pointerout"].forEach((type) => appEl.addEventListener(type, stopHold));
window.addEventListener("blur", stopHold);

// Hovering a chart point with a mouse shows it too.
appEl.addEventListener("pointerover", (event) => {
  const point = event.target.closest("[data-chart-point]");
  if (point && event.pointerType === "mouse") showChartPoint(point);
});

// "Load a backup": a file was picked.
appEl.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.field === "import" && el.files[0]) importData(el.files[0]);
});

// The clock that keeps timers moving on screen.
setInterval(tickClock, 250);

// When the phone wakes up or you switch back to the app, catch up straight away
// (and ask again to keep the screen on, since the phone drops that when you leave).
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  tickClock();
  if (DB.current) keepScreenAwake();
});

// Offline: register the service worker (sw.js), which saves the app's files on the phone.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((error) => {
    console.error("Offline mode not available", error);
  });
}

// Start: carry on with a workout in progress, otherwise show Home.
if (DB.current && getWorkout(DB.current.workoutId)) {
  renderPlayer();
} else {
  DB.current = null;
  goHome();
}
