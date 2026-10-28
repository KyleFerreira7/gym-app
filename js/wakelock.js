/*
  KEEP THE SCREEN AWAKE
  While a workout is on screen, ask the phone not to dim or lock. This uses the
  browser's Screen Wake Lock (works on recent iPhones and in Chrome).
  The phone drops the lock whenever you switch away from the app, so we ask
  again when you come back (see js/app.js).
*/

let wakeLock = null;

async function keepScreenAwake() {
  if (wakeLock || !("wakeLock" in navigator) || document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch (error) {
    // Not allowed right now (e.g. low battery mode). The app works fine without it.
    wakeLock = null;
  }
}

function letScreenSleep() {
  if (wakeLock) wakeLock.release();
  wakeLock = null;
}
