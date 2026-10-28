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

  switch (el.dataset.action) {
    case "home":           return renderHome();
    case "open-routine":   return renderDetail(el.dataset.id);
    case "start":          return startWorkout(el.dataset.id);
    case "quit":           return quitWorkout();
    case "next":           return goToStep(+1);
    case "prev":           return goToStep(-1);
    case "toggle-set":     return toggleSet(Number(el.dataset.set));
    case "toggle-warmup":  return toggleWarmUp();
    case "toggle-timer":   return toggleTimer();
    case "rest-skip":      return endRest();
    case "rest-adjust":
      DB.current.rest.endsAt += Number(el.dataset.seconds) * 1000;
      DB.current.rest.totalMs += Number(el.dataset.seconds) * 1000;
      saveDB();
      return tickClock();
  }
});

// Typing: remember numbers as you type them, and save machine settings.
appEl.addEventListener("input", (event) => {
  const el = event.target;
  const field = el.dataset.field;
  if (!field) return;

  if (field === "settings") {
    DB.machineSettings[el.dataset.exercise] = el.value.trim();
  } else if (DB.current) {
    const key = `${DB.current.step}-${el.dataset.set}`;
    DB.current.drafts[key] = { ...DB.current.drafts[key], [field]: el.value };
    el.classList.remove("needs-value");
  }
  saveDB();
});

// The clock that keeps timers moving on screen.
setInterval(tickClock, 250);

// When the phone wakes up or you switch back to the app, catch up straight away.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tickClock();
});

// Start: carry on with a workout in progress, otherwise show Home.
if (DB.current && getRoutine(DB.current.routineId)) {
  renderPlayer();
} else {
  DB.current = null;
  renderHome();
}
