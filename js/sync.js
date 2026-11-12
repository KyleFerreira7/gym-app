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

// The email and password typed on the Me screen, or null (with a message) if not usable.
function typedLogin() {
  const email = fieldValue("sync-email").trim().toLowerCase();
  const password = fieldValue("sync-password");
  if (!email.includes("@")) { renderMe("Please type your email address."); return null; }
  if (password.length < 8) { renderMe("Your password needs at least 8 characters."); return null; }
  return { email, password };
}

// First time only: make the account. Supabase then emails a link to confirm the address.
async function createAccount() {
  const login = typedLogin();
  if (!login) return;
  let answer;
  try {
    answer = await supabase("/auth/v1/signup", { method: "POST", body: login });
  } catch (error) {
    console.error(error);
    return renderMe(error.status === 429
      ? "Too many tries for now. Wait a few minutes, then try again."
      : `Couldn't create the account: ${error.message}`);
  }
  account = { email: login.email };
  saveAccount();
  // With "Confirm email" on (Supabase's default) there's no session yet, just the email.
  if (!answer.access_token) {
    return renderMe(`Account made. Open the email sent to ${login.email} (check spam), tap the ` +
      "confirmation link, then come back here and sign in.");
  }
  await signedIn(answer);
}

async function signIn() {
  const login = typedLogin();
  if (!login) return;
  try {
    await signedIn(await supabase("/auth/v1/token?grant_type=password", { method: "POST", body: login }));
  } catch (error) {
    console.error(error);
    account = { email: login.email };
    saveAccount();
    if (/not confirmed/i.test(error.message)) {
      return renderMe("Confirm your email first: tap the link in the email Supabase sent, then sign in.");
    }
    renderMe(error.status === 400 ? "Wrong email or password." : "Couldn't sign in. Check you're online and try again.");
  }
}

// Supabase said yes: keep the tokens, then do the first sync.
async function signedIn(session) {
  account = { email: session.user?.email ?? account.email };
  keepSession(session);
  syncStatus = "";
  await syncNow();
  renderMe("Signed in. Your data now syncs to your account.");
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

function accountCard() {
  const synced = account.lastSyncedAt ? `Last synced ${timeAgo(account.lastSyncedAt)}` : "Not synced yet";

  if (isSignedIn()) {
    return `
      <section class="card">
        <p>Signed in as <strong>${esc(account.email)}</strong>. Your workouts sync to your
        account, so a new phone can get them back.</p>
        <p class="backup-status ${syncStatus ? "due" : ""}">${esc(syncStatus || synced)}</p>
        <button class="primary-btn" data-action="sync-now">${icon("upload")} Sync now</button>
        <button class="secondary-btn" data-action="sync-signout">Sign out</button>
      </section>`;
  }

  // A <form> so password managers offer to fill in and save the password. The buttons
  // are type="button", so they run our code instead of reloading the page.
  return `
    <form class="card" autocomplete="on" onsubmit="return false">
      <p>Sign in to keep a copy of your workouts in your account, so a new phone can get
      them back.</p>
      ${syncStatus ? `<p class="backup-status due">${esc(syncStatus)}</p>` : ""}
      <input data-field="sync-email" type="email" name="email" inputmode="email"
        autocomplete="username" placeholder="Email address" value="${esc(account.email || "")}">
      <input data-field="sync-password" type="password" name="password"
        autocomplete="current-password" placeholder="Password (8 or more characters)">
      <button type="button" class="primary-btn" data-action="sync-signin">Sign in</button>
      <button type="button" class="secondary-btn" data-action="sync-create">Create account</button>
      <p class="row-sub">First time? Type an email and a new password, then Create account.</p>
    </form>`;
}

function timeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(todayISO(new Date(timestamp)));
}

// What was typed into a field on the screen (sign-in fields aren't saved as you type).
function fieldValue(name) {
  return document.querySelector(`[data-field="${name}"]`)?.value || "";
}
