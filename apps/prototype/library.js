const libraryLanguages = {
  javascript: {name: "JavaScript", view: "practice", root: "prg", key: "c:"},
  python: {name: "Python", view: "python-practice", root: "python-root", key: "py:"},
  sql: {name: "SQL", view: "sql-practice", root: "sql-root", key: "sql:"}
};
const packRequests = new Map();
let javascriptPackLoaded = false;
let libraryRequest;

function loadPracticePack(language) {
  const ready = {javascript: javascriptPackLoaded, python: pythonProblems.length, sql: sqlProblems.length};
  if (ready[language]) return Promise.resolve();
  if (!packRequests.has(language)) {
    const load = {javascript: loadChallenges, python: loadPythonProblems, sql: loadSqlProblems}[language];
    packRequests.set(language, load().finally(() => packRequests.delete(language)));
  }
  return packRequests.get(language);
}

function parseProblemLink(fragment) {
  const match = /^problem\/(javascript|python|sql)\/([a-zA-Z0-9_-]+)$/.exec(fragment);
  if (!match) return null;
  return {language: match[1], id: match[2], view: libraryLanguages[match[1]].view};
}

function syncProblemLink(language, id) {
  const current = parseProblemLink(location.hash.slice(1));
  if (current?.language === language && current.id !== id) {
    history.replaceState(null, "", "#problem/" + language + "/" + id);
  }
}

async function openLibraryProblem({language, id}) {
  const requested = location.hash;
  const root = document.getElementById(libraryLanguages[language].root);
  root.textContent = "Opening problem…";
  await loadPracticePack(language);
  if (location.hash !== requested) return;
  const pack = {javascript: javascriptPackLoaded ? CH : [], python: pythonProblems, sql: sqlProblems}[language];
  const problem = pack.find(item => (item.id ?? item.i) === id);
  if (!problem) {
    root.innerHTML = '<p class="why">This problem could not be opened. <a class="text-link" href="#library">Return to the library</a></p>';
    return;
  }
  if (language === "javascript") {
    pc = problem;
    Object.assign(practiceFilter, {level: "All", query: "", saved: false});
    prac();
  } else if (language === "python") {
    pythonCurrent = problem;
    renderPythonPractice();
  } else {
    sqlCurrent = problem;
    renderSqlPractice();
  }
}

async function showProblemLibrary() {
  const count = document.getElementById("library-count");
  const results = document.getElementById("library-results");
  const form = document.getElementById("library-filters");
  count.textContent = "Loading problems…";
  if (!libraryRequest) {
    libraryRequest = fetch("library.json").then(response => {
      if (!response.ok) throw Error("Library unavailable");
      return response.json();
    }).catch(error => { libraryRequest = null; throw error; });
  }
  let catalog;
  try { catalog = await libraryRequest; }
  catch {
    results.replaceChildren();
    count.textContent = "The library could not load. ";
    const retry = document.createElement("button");
    retry.className = "btn off";
    retry.textContent = "Try again";
    retry.onclick = showProblemLibrary;
    count.append(retry);
    return;
  }
  if (document.body.dataset.v !== "library") return;
  const company = form.elements.company;
  company.replaceChildren(new Option("All paths", ""));
  for (const [id, name] of Object.entries(catalog.companies)) company.add(new Option(name, id));
  const params = new URLSearchParams(location.hash.split("?")[1]);
  const fields = ["q", "language", "level", "company", "status"];
  for (const name of fields) form.elements[name].value = params.get(name) || "";
  const attempts = attemptStats();

  function draw(saveFilters) {
    const filters = new URLSearchParams();
    for (const name of fields) {
      const value = form.elements[name].value.trim();
      if (value) filters.set(name, value);
    }
    if (saveFilters) history.replaceState(null, "", "#library" + (filters.size ? "?" + filters : ""));
    const words = (filters.get("q") || "").toLowerCase().split(/\s+/);
    const rows = [];
    for (const problem of catalog.problems) {
      const language = libraryLanguages[problem.language];
      const key = language.key + problem.id;
      const attemptId = problem.language === "javascript" ? problem.id : key;
      const bookmarkKey = "b:" + attemptId;
      const last = attempts[attemptId]?.last;
      const solved = Boolean(prog[key]);
      const statuses = {solved, saved: Boolean(prog[bookmarkKey]), new: !solved && !last, retry: last?.passed === false, due: last?.reviewAt <= Date.now()};
      if (filters.has("language") && filters.get("language") !== problem.language) continue;
      if (filters.has("level") && filters.get("level") !== problem.level) continue;
      if (filters.has("company") && !problem.companies.includes(filters.get("company"))) continue;
      if (filters.has("status") && !statuses[filters.get("status")]) continue;
      const terms = [problem.title, problem.topic, language.name, ...problem.companies].join(" ").toLowerCase();
      if (!words.every(word => terms.includes(word))) continue;
      const status = statuses.due ? "Due for review" : statuses.retry ? "Retry" : solved ? "Solved" : "";
      const logos = problem.companies.map(id => `<img src="company-icons/${esc(id)}.svg" alt="${esc(catalog.companies[id])} prep path" title="${esc(catalog.companies[id])} prep path">`).join("");
      rows.push(`<li><a class="library-row" href="#problem/${problem.language}/${encodeURIComponent(problem.id)}">
        <img class="library-language" src="icons/${problem.language}.svg" alt="${language.name}">
        <span class="library-title"><strong>${esc(problem.title)}</strong><small>${esc(problem.topic)}${status ? " · " + status : ""}</small></span>
        <span class="library-companies">${logos}</span><span class="library-level" data-level="${problem.level}">${problem.level}</span></a>
        <button type="button" class="library-save" data-bookmark="${esc(bookmarkKey)}" aria-label="Save ${esc(problem.title)}" aria-pressed="${statuses.saved}">${statuses.saved ? "★" : "☆"}</button></li>`);
    }
    count.textContent = rows.length + " of " + catalog.problems.length + " problems";
    results.innerHTML = rows.length ? '<ul class="library-list">' + rows.join("") + "</ul>" : '<p class="why">No problems match these filters. Clear a filter to see more.</p>';
  }
  form.oninput = () => draw(true);
  form.onsubmit = event => { event.preventDefault(); draw(true); };
  form.onreset = event => {
    event.preventDefault();
    for (const name of fields) form.elements[name].value = "";
    draw(true);
  };
  results.onclick = event => {
    const button = event.target.closest("button[data-bookmark]");
    if (!button) return;
    const key = button.dataset.bookmark;
    prog[key] = !prog[key];
    save();
    draw(false);
    const nextFocus = results.querySelector('[data-bookmark="' + CSS.escape(key) + '"]')
      || results.querySelector(".library-save") || form.elements.status;
    nextFocus.focus({preventScroll:true});
  };
  draw(false);
}
