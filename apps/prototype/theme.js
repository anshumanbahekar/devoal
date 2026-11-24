(() => {
  const key = "dv-theme.v1", system = matchMedia("(prefers-color-scheme: light)");
  let choice = "dark";
  try { const saved = localStorage.getItem(key); if (["dark", "light", "system"].includes(saved)) choice = saved; } catch {}
  function apply() {
    document.documentElement.dataset.theme = choice === "system" ? (system.matches ? "light" : "dark") : choice;
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    const control = document.getElementById("theme-choice");
    if (control) control.value = choice;
  }
  apply();
  system.addEventListener("change", apply);
  addEventListener("storage", event => {
    if (event.key !== key) return;
    choice = ["dark", "light", "system"].includes(event.newValue) ? event.newValue : "dark";
    apply();
  });
  addEventListener("DOMContentLoaded", () => {
    const control = document.getElementById("theme-choice");
    apply();
    control?.addEventListener("change", () => {
      choice = control.value;
      try { localStorage.setItem(key, choice); } catch {}
      apply();
    });
  });
})();
