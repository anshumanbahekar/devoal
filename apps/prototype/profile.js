const profileLanguages = [
  ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"],
  ["cpp", "C++"], ["rust", "Rust"], ["go", "Go"], ["java", "Java"], ["sql", "SQL"]
];
const profileGoals = [1, 2, 3, 5, 10];

function profileDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"})
    : "";
}

export function renderProfileAvatar(container, user) {
  const name = String(user?.displayName || "").trim() || String(user?.email || "").trim() || "Developer";
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? words[0][0] + words.at(-1)[0] : name.slice(0, 2);
  container.replaceChildren();
  container.textContent = initials.toUpperCase();
  container.setAttribute("aria-hidden", "true");
  try {
    const url = new URL(user?.photoURL || "");
    if (url.protocol !== "https:") return;
    const image = document.createElement("img");
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove(), {once: true});
    image.src = url.href;
    container.append(image);
  } catch { /* The initials remain visible when no usable photo is available. */ }
}

export function mountProfilePanel(container, {saveProfile, exportBackup, openProgress}) {
  container.classList.add("profile-panel");
  container.innerHTML = `<div class="profile-identity">
    <span class="profile-avatar"></span>
    <div><strong class="profile-display-name"></strong><span class="profile-email"></span><span class="profile-verification"></span></div>
  </div>
  <div class="profile-social-links" aria-label="Social profiles"></div>
  <form class="profile-form">
    <fieldset class="profile-section"><legend>Profile</legend>
      <label for="profile-name">Display name</label>
      <input id="profile-name" name="displayName" autocomplete="nickname" maxlength="60" required>
      <div class="profile-label-row"><label for="profile-bio">About you <span>(optional)</span></label><span class="profile-bio-count" aria-hidden="true">0 / 280</span></div>
      <textarea id="profile-bio" name="bio" maxlength="280" rows="3" placeholder="What are you learning or building?"></textarea>
    </fieldset>
    <fieldset class="profile-section"><legend>Social profiles</legend>
      <label class="profile-social-label" for="profile-x"><img src="icons/x.svg" alt="">X username</label>
      <input id="profile-x" name="xUsername" maxlength="15" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username" aria-describedby="profile-social-help">
      <label class="profile-social-label" for="profile-linkedin"><img src="icons/linkedin.svg" alt="">LinkedIn username</label>
      <input id="profile-linkedin" name="linkedinUsername" maxlength="100" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="anshumanbahekar" aria-describedby="profile-social-help">
      <p class="profile-help" id="profile-social-help">Enter only your username. We create the profile link for you.</p>
    </fieldset>
    <fieldset class="profile-section"><legend>Learning preferences</legend>
      <div class="profile-preferences">
        <div><label for="profile-language">Focus language</label><select id="profile-language" name="language"></select></div>
        <div><label for="profile-goal">Daily goal</label><select id="profile-goal" name="goal" aria-describedby="profile-goal-help"></select></div>
      </div>
      <p class="profile-help" id="profile-goal-help">Completed lessons, challenges, and quizzes count toward your daily goal.</p>
      <p class="profile-help">Preferences are saved in this browser and sync when account sync is available.</p>
    </fieldset>
    <div class="profile-save-row"><button class="btn" type="submit">Save changes</button><p class="profile-feedback" role="status"></p></div>
  </form>
  <section class="profile-section profile-signin" aria-labelledby="profile-signin-title">
    <h3 id="profile-signin-title">Sign-in details</h3><div class="profile-providers"></div><dl class="profile-dates"></dl>
    <p class="profile-help">Your sign-in provider manages your email and password.</p>
  </section>
  <section class="profile-section profile-data" aria-labelledby="profile-data-title">
    <h3 id="profile-data-title">Your progress</h3><p class="profile-help">Keep a backup of your code, notes, checkpoints, and learning history.</p>
    <div class="profile-data-actions"><button type="button" class="btn off" data-profile-export>Export backup</button><button type="button" class="btn off" data-profile-progress>View progress</button></div>
    <p class="profile-data-feedback" role="status"></p>
  </section>`;

  const form = container.querySelector("form");
  const fields = form.elements;
  const feedback = container.querySelector(".profile-feedback");
  const dataFeedback = container.querySelector(".profile-data-feedback");
  const bioCount = container.querySelector(".profile-bio-count");
  const exportButton = container.querySelector("[data-profile-export]");
  const progressButton = container.querySelector("[data-profile-progress]");
  let externallyBusy = false;
  let saving = false;
  let exporting = false;
  let currentUser = null;

  for (const [value, title] of profileLanguages) fields.language.add(new Option(title, value));
  for (const goal of profileGoals) fields.goal.add(new Option(goal + (goal === 1 ? " activity / day" : " activities / day"), goal));

  function updateBusy() {
    for (const control of form.querySelectorAll("input,textarea,select,button")) control.disabled = externallyBusy || saving;
    exportButton.disabled = externallyBusy || saving || exporting;
    progressButton.disabled = externallyBusy || saving;
    form.querySelector('button[type="submit"]').textContent = saving ? "Saving…" : "Save changes";
    form.setAttribute("aria-busy", String(saving));
  }

  fields.bio.addEventListener("input", () => { bioCount.textContent = fields.bio.value.length + " / 280"; });
  form.addEventListener("input", () => {
    feedback.textContent = "Unsaved changes";
    feedback.removeAttribute("data-error");
  });
  form.addEventListener("change", () => {
    feedback.textContent = "Unsaved changes";
    feedback.removeAttribute("data-error");
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (saving || externallyBusy || !currentUser) return;
    const values = {
      displayName: fields.displayName.value.trim(), bio: fields.bio.value.trim(),
      language: fields.language.value, goal: Number(fields.goal.value)
      , xUsername: fields.xUsername.value.trim().replace(/^@/, ""), linkedinUsername: fields.linkedinUsername.value.trim()
    };
    if ((values.xUsername && !/^[A-Za-z0-9_]{1,15}$/.test(values.xUsername)) ||
        (values.linkedinUsername && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,98}[A-Za-z0-9]$/.test(values.linkedinUsername))) {
      feedback.textContent = "Enter usernames only, without a URL. X allows 1–15 letters, numbers, or underscores; LinkedIn allows 3–100 letters, numbers, hyphens, or underscores.";
      feedback.dataset.error = "true";
      return;
    }
    if (!values.displayName || values.displayName.length > 60 || values.bio.length > 280 ||
        !profileLanguages.some(([id]) => id === values.language) || !profileGoals.includes(values.goal)) {
      feedback.textContent = "Enter a name and choose a language and daily goal.";
      feedback.dataset.error = "true";
      return;
    }
    saving = true;
    updateBusy();
    feedback.textContent = "Saving changes…";
    feedback.removeAttribute("data-error");
    try {
      await saveProfile(values);
      feedback.textContent = "Profile saved.";
    } catch (error) {
      feedback.textContent = error?.message || "Could not save your profile. Please try again.";
      feedback.dataset.error = "true";
    } finally {
      saving = false;
      updateBusy();
    }
  });

  exportButton.addEventListener("click", async () => {
    if (exporting || externallyBusy || saving) return;
    exporting = true;
    updateBusy();
    dataFeedback.removeAttribute("data-error");
    try {
      await exportBackup();
      dataFeedback.textContent = "Backup downloaded.";
    } catch {
      dataFeedback.textContent = "Could not export a backup. Please try again.";
      dataFeedback.dataset.error = "true";
    } finally {
      exporting = false;
      updateBusy();
    }
  });
  progressButton.addEventListener("click", () => openProgress());

  function render(user, profile = {}) {
    currentUser = user;
    container.hidden = !user;
    container.closest("dialog")?.classList.toggle("has-profile", Boolean(user));
    if (!user) return;
    renderProfileAvatar(container.querySelector(".profile-avatar"), user);
    container.querySelector(".profile-display-name").textContent = user.displayName || "Your profile";
    container.querySelector(".profile-email").textContent = user.email || "No email shared by your provider";
    const verification = container.querySelector(".profile-verification");
    verification.textContent = user.email ? (user.emailVerified ? "Email verified" : "Email not verified") : "";
    verification.dataset.verified = String(Boolean(user.emailVerified));
    fields.displayName.value = user.displayName || "";
    fields.bio.value = typeof profile.bio === "string" ? profile.bio.slice(0, 280) : "";
    fields.xUsername.value = profile.xUsername || "";
    fields.linkedinUsername.value = profile.linkedinUsername || "";
    const links = container.querySelector(".profile-social-links");
    links.replaceChildren();
    for (const [key, label, icon, base, valid] of [
      ["xUsername", "X", "x", "https://x.com/", /^[A-Za-z0-9_]{1,15}$/],
      ["linkedinUsername", "LinkedIn", "linkedin", "https://www.linkedin.com/in/", /^[A-Za-z0-9][A-Za-z0-9_-]{1,98}[A-Za-z0-9]$/]
    ]) {
      const username = profile[key];
      if (typeof username !== "string" || !valid.test(username)) continue;
      const link = document.createElement("a"), image = document.createElement("img"), text = document.createElement("span");
      link.href = base + encodeURIComponent(username);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", label + " profile: " + username);
      image.src = "icons/" + icon + ".svg";
      image.alt = "";
      text.textContent = username;
      link.append(image, text);
      links.append(link);
    }
    fields.language.value = profileLanguages.some(([id]) => id === profile.language) ? profile.language : "javascript";
    fields.goal.value = String(profileGoals.includes(Number(profile.goal)) ? Number(profile.goal) : 2);
    bioCount.textContent = fields.bio.value.length + " / 280";
    feedback.textContent = "";
    feedback.removeAttribute("data-error");
    dataFeedback.textContent = "";
    const providers = container.querySelector(".profile-providers");
    providers.replaceChildren();
    const ids = new Set((Array.isArray(user.providerData) ? user.providerData : []).map(item => item?.providerId));
    for (const [id, title, icon] of [["google.com", "Google", "google"], ["github.com", "GitHub", "github"]]) {
      if (!ids.has(id)) continue;
      const provider = document.createElement("div");
      provider.className = "profile-provider";
      const image = document.createElement("img");
      image.src = "icons/" + icon + ".svg";
      image.alt = "";
      const name = document.createElement("span");
      name.textContent = title;
      const connected = document.createElement("small");
      connected.textContent = "Connected";
      provider.append(image, name, connected);
      providers.append(provider);
    }
    if (!providers.childElementCount) providers.textContent = "Provider details are unavailable.";
    const dates = container.querySelector(".profile-dates");
    dates.replaceChildren();
    for (const [label, raw] of [["Joined", user.metadata?.creationTime], ["Last sign-in", user.metadata?.lastSignInTime]]) {
      const value = profileDate(raw);
      if (!value) continue;
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      dates.append(term, description);
    }
    updateBusy();
  }

  return {render, setBusy(value) { externallyBusy = Boolean(value); updateBusy(); }};
}
