/*
  APP: starts everything and handles taps and typing.

  Instead of attaching a handler to every button, there's one listener for the
  whole page. When you tap, it finds the nearest element with data-action="..."
  and runs the matching function. This keeps working when screens are redrawn.
*/

appEl.addEventListener("click", (event) => {
  unlockSound(); // iPhones only allow sound after a tap

  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const id = el.dataset.id;

  switch (el.dataset.action) {
    // Browsing
    case "home":           return goHome();
    case "tab":            return id === "me" ? goMe() : goHome();
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
    case "toggle-set":     return toggleSet(Number(el.dataset.set));
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
  } else if (DB.current) {
    const key = `${DB.current.step}-${el.dataset.set}`;
    DB.current.drafts[key] = { ...DB.current.drafts[key], [field]: el.value };
    el.classList.remove("needs-value");
  }
  saveDB();
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
