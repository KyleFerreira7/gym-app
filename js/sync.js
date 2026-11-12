/*
  SYNC: your account, and a copy of your data online (Supabase).

  How it works, in short:
    - Supabase is a hosted database with sign-in. This app stays on GitHub Pages;
      it only sends requests to Supabase (plain fetch calls, no library).
    - Signing in: email and password. The first time, "Create account" makes the
      account and Supabase emails one link to confirm the email address. After that,
      "Sign in" sends the email and password, and Supabase answers with two tokens:
        access token   proves who you are on every request. Lasts about an hour.
        refresh token  swaps for a new access token when the old one runs out,
                       so you stay signed in for months without new emails.
    - The database has one table, user_data: one row per person, holding the same
      data as a backup file. A security rule in Supabase (Row Level Security) lets
      each signed-in person read and write only their own row.
    - Syncing: when the app opens, it downloads your row and MERGES it in (the same
      merge as "Load a backup": adds what's missing, never deletes). Then, after any
      change, it uploads everything a few seconds later.
    - Safety rule: nothing is uploaded until a download has worked since the app
      opened. So a new, empty phone can never overwrite what's saved online.

  The publishable key below is meant to be public (it's in every visitor's browser
  anyway). What protects the data is the security rule, not the key. The SECRET key
  must never go in this app.

  Known limit: deletes only spread by replacing the online copy. If you delete a
  workout on one phone while another phone still has it, the other phone can add it
  back. Fine for one person on one phone.
*/

const SUPABASE_URL = "https://ekvwqdtolhqdeqnbkuus.supabase.co";
const SUPABASE_KEY = "sb_publishable_eTdBd5FkQq5fDySzkICdPA_RGKaNRNN";

// Saved separately from DB, so sign-in tokens never end up in a backup file.
const ACCOUNT_KEY = "rep-account";
const UPLOAD_DELAY_MS = 4000; // wait for a pause in changes, then upload once

// { email, userId, accessToken, refreshToken, expiresAt, lastSyncedAt }
// (The password is never saved here: it's only sent once, when signing in.)
let account = loadAccount();
let downloaded = false;   // true once this app session has merged the online copy
let uploadTimer = null;
let syncStatus = "";      // a short line for the Me screen, e.g. "Couldn't reach your account"

function loadAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveAccount() {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch (error) {
    console.error("Could not save account", error);
  }
}

function isSignedIn() {
  return Boolean(account.refreshToken);
}

// ---------- Talking to Supabase ----------

// One request to Supabase. `path` is e.g. "/auth/v1/otp". Signed-in requests also
// send the access token, so the database knows whose row it is.
async function supabase(path, { method = "GET", body, signedIn = false, headers = {}, keepalive = false } = {}) {
  const allHeaders = { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...headers };
  if (signedIn) allHeaders.Authorization = `Bearer ${await accessToken()}`;
  const response = await fetch(SUPABASE_URL + path, {
    method, headers: allHeaders, keepalive, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || data?.error_description || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// Remember the tokens Supabase sends after signing in or refreshing.
function keepSession(session) {
  account.accessToken = session.access_token;
  account.refreshToken = session.refresh_token;
  account.expiresAt = Date.now() + session.expires_in * 1000;
  account.userId = session.user?.id ?? account.userId;
  saveAccount();
}

// A valid access token, refreshing it first if it's (nearly) run out.
async function accessToken() {
  if (account.accessToken && account.expiresAt - 60000 > Date.now()) return account.accessToken;
  try {
    keepSession(await supabase("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: { refresh_token: account.refreshToken },
    }));
  } catch (error) {
    // 400/401: the refresh token is no longer accepted, so sign in again.
    if (error.status === 400 || error.status === 401) signOutLocally("Signed out. Please sign in again.");
    throw error;
  }
  return account.accessToken;
}

// ---------- Signing in and out ----------

// Sign in with what's typed in the sign-in form (on Me, or the pop-up on Home).
// Returns null when it worked, or a message saying what went wrong.
// (New accounts can't be made from the app: sign-ups are switched off in Supabase,
// so the account is just mine for now. The "Create account" button was removed
// 2026-11-12; it's in git history if sign-ups open up later.)
async function signIn() {
  const email = fieldValue("sync-email").trim().toLowerCase();
  const password = fieldValue("sync-password");
  if (!email.includes("@") || !password) return "Type your email and password.";
  let session;
  try {
    session = await supabase("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  } catch (error) {
    console.error(error);
    account = { email };
    saveAccount();
    return error.status === 400 ? "Wrong email or password." : "Couldn't sign in. Check you're online and try again.";
  }
  // Supabase said yes: keep the tokens, then do the first sync.
  account = { email: session.user?.email ?? email };
  keepSession(session);
  syncStatus = "";
  await syncNow();
  return null;
}

// The Sign in button on Me.
async function signInFromMe() {
  const problem = await signIn();
  renderMe(problem || "Signed in.");
}

// The pop-up on Home, shown each time the app opens while signed out (js/app.js).
function showSignInSheet() {
  openSheet("Sign in", `
    <p class="sheet-intro">Sign in to keep your workouts safe in your account.</p>
    ${signInForm()}
    <button type="button" class="secondary-btn sheet-later" data-close>Not now</button>
  `, async (picked) => {
    if (picked.dataset.pick !== "sign-in") return true;
    picked.disabled = true;
    const problem = await signIn();
    if (!problem) {
      picked.closest(".info-sheet").remove();
      goHome(); // redraw, in case the sync brought in new history
      return true;
    }
    picked.disabled = false;
    picked.closest(".info-panel").querySelector(".sheet-message").textContent = problem;
    return true; // stay open to try again
  });
}

// Forget the tokens on this device. Your data stays here and in your account.
function signOutLocally(message = "") {
  clearTimeout(uploadTimer);
  account = { email: account.email };
  downloaded = false;
  saveAccount();
  syncStatus = message;
}

async function signOut() {
  if (!confirm("Sign out on this device? Your workouts stay on this phone and in your account.")) return;
  try {
    await supabase("/auth/v1/logout", { method: "POST", signedIn: true }); // ends the session online too
  } catch (error) {
    // Offline or already expired: signing out here is still fine.
  }
  signOutLocally();
  renderMe("Signed out.");
}

// ---------- Download, merge, upload ----------

// Download the online copy, merge it in, then upload the result.
async function syncNow() {
  if (!isSignedIn()) return;
  try {
    const rows = await supabase("/rest/v1/user_data?select=data", { signedIn: true });
    // No row yet means this is the first sync: there's nothing to merge.
    if (rows.length > 0) mergeData(rows[0].data);
    downloaded = true;
    await upload();
    syncStatus = "";
  } catch (error) {
    console.error("Sync failed", error);
    if (isSignedIn()) syncStatus = "Couldn't reach your account. Will try again later.";
  }
  if (document.querySelector("[data-screen='me']")) renderMe();
}

// Replace the online copy with everything on this device. Upsert = insert the row
// the first time, update it after that ("on_conflict=user_id").
async function upload({ keepalive = false } = {}) {
  clearTimeout(uploadTimer);
  uploadTimer = null;
  if (!isSignedIn() || !downloaded) return;
  await supabase("/rest/v1/user_data?on_conflict=user_id", {
    method: "POST",
    signedIn: true,
    keepalive,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: {
      user_id: account.userId,
      data: { ...DB, current: null }, // a workout in progress stays on this phone
      updated_at: new Date().toISOString(),
    },
  });
  account.lastSyncedAt = Date.now();
  saveAccount();
}

// Called by saveDB() after every change: upload once things have been quiet a moment.
function scheduleCloudSave() {
  if (!isSignedIn() || !downloaded) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => upload().catch((error) => {
    console.error("Upload failed", error);
    syncStatus = "Couldn't reach your account. Will try again later.";
  }), UPLOAD_DELAY_MS);
}

// Leaving the app with an upload still waiting: send it now. keepalive lets the
// request finish even if the phone puts the app to sleep.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && uploadTimer) upload({ keepalive: true }).catch(() => {});
  if (!document.hidden && isSignedIn() && !downloaded) syncNow();
});

// Back online after a failed sync: try again.
window.addEventListener("online", () => {
  if (isSignedIn()) downloaded ? upload().catch(() => {}) : syncNow();
});

// ---------- The Account card on the Me screen ----------

// The email + password form, used on Me and in the Home pop-up. A <form> so password
// managers offer to fill it in. The button is type="button", so it runs our code
// instead of reloading the page. In the pop-up, data-pick sends taps to its handler.
function signInForm() {
  return `
    <form class="sign-in-form" autocomplete="on" onsubmit="return false">
      <input data-field="sync-email" type="email" name="email" inputmode="email"
        autocomplete="username" placeholder="Email" value="${esc(account.email || "")}">
      <input data-field="sync-password" type="password" name="password"
        autocomplete="current-password" placeholder="Password">
      <p class="sheet-message"></p>
      <button type="button" class="primary-btn" data-action="sync-signin" data-pick="sign-in">Sign in</button>
    </form>`;
}

function accountCard() {
  if (isSignedIn()) {
    // Syncing happens by itself, so this is just who you are and a way out.
    return `
      <section class="card account-row">
        <div>
          <span class="eyebrow">Signed in</span>
          <strong>${esc(account.email)}</strong>
          ${syncStatus ? `<p class="backup-status due">${esc(syncStatus)}</p>` : ""}
        </div>
        <button class="small-btn" data-action="sync-signout">Sign out</button>
      </section>`;
  }
  return `
    <section class="card">
      ${syncStatus ? `<p class="backup-status due">${esc(syncStatus)}</p>` : ""}
      ${signInForm()}
    </section>`;
}

// What was typed into a field on the screen (sign-in fields aren't saved as you type).
function fieldValue(name) {
  return document.querySelector(`[data-field="${name}"]`)?.value || "";
}
