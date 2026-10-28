/*
  SERVICE WORKER: makes the app work offline.

  A service worker is a small script the browser keeps running next to the app.
  It sits between the app and the internet, so it can answer requests itself.

  How this one works:
    1. When installed, it saves a copy of every app file and every exercise
       picture (it reads data/exercises.js to know which pictures exist).
    2. When the app asks for a file, it tries the internet first, so you always
       get the newest version, and saves that copy.
    3. If there's no signal (or it takes longer than 3 seconds, like gym wifi),
       it answers from the saved copy instead.

  Because it always tries the internet first, editing files on your Mac still
  shows up straight away on a normal reload.
*/

const CACHE = "rep-v3"; // change this name to throw away all saved copies
const WAIT_MS = 3000;

// The app's own files.
const APP_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "data/exercises.js",
  "data/workouts.js",
  "data/plans.js",
  "data/groupings.js",
  "js/icons.js",
  "js/storage.js",
  "js/sound.js",
  "js/wakelock.js",
  "js/screens.js",
  "js/player.js",
  "js/progress.js",
  "js/builder.js",
  "js/me.js",
  "js/app.js",
  "img/placeholder.svg",
  "img/icons/icon-180.png",
  "img/icons/icon-192.png",
  "img/icons/icon-512.png",
];

// Load the exercise list so we know which pictures to save.
importScripts("data/exercises.js");
// Start pictures, plus end-position pictures where they exist (missing ones are skipped).
const PICTURES = EXERCISES.flatMap((ex) => [`img/exercises/${ex.id}.jpg`, `img/exercises/${ex.id}-end.jpg`]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Save each file on its own, so one missing picture (e.g. bike) doesn't stop the rest.
      Promise.allSettled([...APP_FILES, ...PICTURES].map((file) =>
        cache.add(new Request(file, { cache: "no-cache" }))))
    )
  );
  self.skipWaiting(); // use the new version straight away
});

self.addEventListener("activate", (event) => {
  // Delete saved copies from older versions (other CACHE names).
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only handle the app's own files.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  // cache: "no-cache" asks the server every time whether the file changed (a quick
  // check), instead of trusting the browser's own short-term copy. Without it, right
  // after an update the phone could mix new and old files for a few minutes.
  const fromNetwork = fetch(request, { cache: "no-cache" }).then((response) => {
    if (response.ok) cache.put(request, response.clone()); // keep the saved copy fresh
    return response;
  });

  // Whichever comes first: the internet's answer, or 3 seconds passing.
  const timeout = new Promise((resolve) => setTimeout(resolve, WAIT_MS, "timeout"));
  try {
    const result = await Promise.race([fromNetwork, timeout]);
    if (result !== "timeout") return result;
  } catch (error) {
    // No internet at all: fall through to the saved copy.
  }

  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;
  return fromNetwork; // nothing saved: keep waiting for the internet
}
