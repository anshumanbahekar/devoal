import {syncKeys, readBrowserState, mergeBrowserState, switchBrowserAccount} from "./auth-data.js?v=3";

const byId = id => document.getElementById(id);
const dialog = byId("auth-dialog");
const entry = byId("account-button");
const status = byId("auth-status");
const google = byId("auth-google");
const github = byId("auth-github");
const logout = byId("auth-out");

entry.addEventListener("click", () => dialog.showModal());
dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

const signInErrors = {
  "auth/popup-blocked": "Allow pop-ups for Devoal and select your provider again.",
  "auth/popup-closed-by-user": "Sign-in window closed. You can try again.",
  "auth/account-exists-with-different-credential": "This email already has a Devoal account. Continue with the provider you used first.",
  "auth/network-request-failed": "Check your connection and try again.",
  "auth/operation-not-allowed": "This provider is unavailable. Try the other provider or continue as a guest.",
  "auth/unauthorized-domain": "Sign-in is unavailable on this domain. You can continue as a guest."
};

async function startAccounts() {
  const response = await fetch("firebase-config.json", {cache: "no-store"});
  if (!response.ok) throw new Error("Account configuration unavailable");
  const config = await response.json();
  if (!["apiKey", "authDomain", "projectId", "appId"].every(key => config?.[key]?.trim())) {
    status.textContent = "Google and GitHub sign-in are awaiting setup. You can practice as a guest and keep your progress in this browser.";
    return;
  }

  const [{initializeApp}, {getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged}, {getFirestore, doc, getDoc, setDoc, serverTimestamp}] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js")
  ]);
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let session = null;
  let busy = false;

  function showUser(user) {
    entry.textContent = user ? "Account" : "Sign in";
    byId("auth-title").textContent = user ? "Your account" : "Sign in or sign up";
    byId("auth-description").textContent = user
      ? `Signed in as ${user.displayName || user.email || "a developer"}.`
      : "Choose a provider to save your progress. Your first sign-in creates your Devoal account.";
    byId("auth-done").textContent = user ? "Done" : "Continue as guest";
    google.hidden = github.hidden = Boolean(user);
    google.disabled = github.disabled = busy;
    logout.hidden = !user;
  }

  async function writeCloud() {
    const active = session;
    if (!active?.ready || active.user.uid !== auth.currentUser?.uid || localStorage.getItem("dv-last-uid") !== active.user.uid) return;
    if (active.writing) await active.writing;
    if (session !== active || active.user.uid !== auth.currentUser?.uid || localStorage.getItem("dv-last-uid") !== active.user.uid) return;
    const state = readBrowserState(localStorage);
    const serialized = JSON.stringify(state);
    if (serialized === active.saved) return;
    if (serialized.length > 750_000) {
      status.textContent = "Cloud sync is paused because your work is too large. Export a backup from Progress.";
      return;
    }
    try {
      active.writing = setDoc(active.ref, {state, clientAt: Date.now(), updatedAt: serverTimestamp()});
      await active.writing;
      active.saved = serialized;
      if (session === active) status.textContent = "Progress saved to your account.";
    } catch {
      if (session === active) status.textContent = "Cloud sync is paused. Your work is still in this browser.";
    } finally {
      active.writing = false;
    }
  }

  onAuthStateChanged(auth, async user => {
    const active = user ? {user, ref: doc(db, "users", user.uid, "state", "progress"), ready: false, saved: "", writing: false} : null;
    session = active;
    try {
      if (switchBrowserAccount(localStorage, user?.uid || null)) {
        location.reload();
        return;
      }
    } catch {
      session = null;
      status.textContent = "Could not switch browser profiles. Export a backup from Progress and free browser storage before retrying.";
      return;
    }
    showUser(user);
    status.textContent = user ? "Loading your progress…" : "";
    if (!active) return;
    try {
      const remote = await getDoc(active.ref);
      if (session !== active || auth.currentUser?.uid !== user.uid || localStorage.getItem("dv-last-uid") !== user.uid) return;
      const local = readBrowserState(localStorage);
      const prior = localStorage.getItem("dv-last-uid");
      const merged = mergeBrowserState(local, remote.exists() ? remote.data().state || {} : {}, {differentUser: Boolean(prior && prior !== user.uid)});
      let changed = false;
      for (const key of syncKeys) {
        const value = merged[key] ?? null;
        if (local[key] === value) continue;
        changed = true;
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      localStorage.setItem("dv-last-uid", user.uid);
      if (changed) {
        location.reload();
        return;
      }
      active.ready = true;
      await writeCloud();
    } catch {
      if (session === active) status.textContent = "Signed in. Refresh to retry cloud sync. Your progress is still in this browser.";
    }
  }, () => { status.textContent = "Could not check your account. Refresh to try again."; });
  setInterval(() => writeCloud().catch(() => {
    status.textContent = "Cloud sync is paused. Your work is still in this browser.";
  }), 5000);
  window.addEventListener("storage", event => {
    if (event.key === "dv-last-uid") location.reload();
  });

  async function signIn(provider) {
    if (busy) return;
    busy = google.disabled = github.disabled = true;
    status.textContent = "Opening sign-in…";
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      status.textContent = signInErrors[error?.code] || "Sign-in could not finish. Please try again.";
    } finally {
      busy = google.disabled = github.disabled = false;
    }
  }
  google.addEventListener("click", () => signIn(new GoogleAuthProvider()));
  github.addEventListener("click", () => signIn(new GithubAuthProvider()));
  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      // Keep the latest local version even if the network write remains pending.
      if (session?.user) localStorage.setItem(`dv-account-state.v1:${session.user.uid}`, JSON.stringify(readBrowserState(localStorage)));
      await Promise.race([writeCloud().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
      await signOut(auth);
      dialog.close();
    } catch {
      status.textContent = "Could not sign out. Try again.";
    } finally {
      logout.disabled = false;
    }
  });
}

startAccounts().catch(() => {
  status.textContent = "Account service could not load. Refresh to retry or continue as a guest.";
});
