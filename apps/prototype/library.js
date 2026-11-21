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
  try { await loadPracticePack(language); }
  catch {
    if (location.hash !== requested) return;
    root.innerHTML = '<p class="why">This problem could not load. Check your connection and try again.</p><button class="btn off" type="button">Try again</button>';
    root.querySelector("button").onclick = () => openLibraryProblem({language, id});
    return;
  }
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
  if (!form.elements.topic) {
    const label = document.createElement("label");
    label.textContent = "Topic";
    const select = document.createElement("select");
    select.name = "topic";
    select.setAttribute("aria-label", "Topic");
    label.append(select);
    form.insertBefore(label, form.querySelector('button[type="reset"]'));
  }
  const topic = form.elements.topic;
  topic.replaceChildren(new Option("All topics", ""));
  for (const name of [...new Set(catalog.problems.map(problem => problem.topic))].sort((a, b) => a.localeCompare(b))) {
    topic.add(new Option(name, name));
  }
  if (!form.elements.sort) {
    const label = document.createElement("label");
    label.textContent = "Sort by";
    const select = document.createElement("select");
    select.name = "sort";
    select.setAttribute("aria-label", "Sort by");
    for (const [value, name] of [["", "Recommended"], ["easiest", "Easiest first"], ["hardest", "Hardest first"], ["title", "Title A–Z"]]) {
      select.add(new Option(name, value));
    }
    label.append(select);
    form.insertBefore(label, form.querySelector('button[type="reset"]'));
  }
  const params = new URLSearchParams(location.hash.split("?")[1]);
  const fields = ["q", "language", "level", "company", "status", "topic", "sort"];
  for (const name of fields) form.elements[name].value = params.get(name) || "";

  function draw(saveFilters) {
    const filters = new URLSearchParams(location.hash.split("?")[1]);
    for (const name of fields) {
      const value = form.elements[name].value.trim();
      if (value) filters.set(name, value);
      else filters.delete(name);
    }
    if (saveFilters) history.replaceState(null, "", "#library" + (filters.size ? "?" + filters : ""));
    const words = (filters.get("q") || "").toLowerCase().split(/\s+/);
    const rows = [];
    const attempts = attemptStats();
    const now = Date.now();
    for (const problem of catalog.problems) {
      const language = libraryLanguages[problem.language];
      const key = language.key + problem.id;
      const attemptId = problem.language === "javascript" ? problem.id : key;
      const bookmarkKey = "b:" + attemptId;
      const last = attempts[attemptId]?.last;
      const solved = Boolean(prog[key]);
      const statuses = {solved, saved: Boolean(prog[bookmarkKey]), new: !solved && !last, retry: last?.passed === false, due: last?.reviewAt <= now};
      if (filters.has("language") && filters.get("language") !== problem.language) continue;
      if (filters.has("level") && filters.get("level") !== problem.level) continue;
      if (filters.has("company") && !problem.companies.includes(filters.get("company"))) continue;
      if (filters.has("status") && !statuses[filters.get("status")]) continue;
      if (filters.has("topic") && filters.get("topic") !== problem.topic) continue;
      const terms = [problem.title, problem.topic, language.name, ...problem.companies].join(" ").toLowerCase();
      if (!words.every(word => terms.includes(word))) continue;
      const status = statuses.due ? "Due for review" : statuses.retry ? "Retry" : solved ? "Solved" : "";
      const rank = statuses.due ? 0 : statuses.retry ? 1 : !solved ? 2 : 3;
      rows.push({problem, language, bookmarkKey, statuses, status, rank});
    }
    const difficulty = {Easy: 0, Medium: 1, Hard: 2};
    const sorting = filters.get("sort");
    rows.sort((a, b) => {
      const byTitle = a.problem.title.localeCompare(b.problem.title)
        || a.problem.language.localeCompare(b.problem.language)
        || a.problem.id.localeCompare(b.problem.id);
      const byDifficulty = difficulty[a.problem.level] - difficulty[b.problem.level];
      if (sorting === "title") return byTitle;
      if (sorting === "easiest") return byDifficulty || byTitle;
      if (sorting === "hardest") return -byDifficulty || byTitle;
      return a.rank - b.rank || byDifficulty || byTitle;
    });
    const items = rows.map(({problem, language, bookmarkKey, statuses, status}) => {
      const logos = problem.companies.map(id => `<img src="company-icons/${esc(id)}.svg" alt="${esc(catalog.companies[id])} prep path" title="${esc(catalog.companies[id])} prep path">`).join("");
      return `<li><a class="library-row" href="#problem/${problem.language}/${encodeURIComponent(problem.id)}">
        <img class="library-language" src="icons/${problem.language}.svg" alt="${language.name}">
        <span class="library-title"><strong>${esc(problem.title)}</strong><small>${esc(problem.topic)}${status ? " · " + status : ""}</small></span>
        <span class="library-companies">${logos}</span><span class="library-level" data-level="${problem.level}">${problem.level}</span></a>
        <button type="button" class="library-save" data-bookmark="${esc(bookmarkKey)}" aria-label="Save ${esc(problem.title)}" aria-pressed="${statuses.saved}">${statuses.saved ? "★" : "☆"}</button></li>`;
    });
    count.textContent = rows.length + " of " + catalog.problems.length + " problems";
    results.innerHTML = rows.length ? '<ul class="library-list">' + items.join("") + "</ul>" : '<p class="why">No problems match these filters. Clear a filter to see more.</p>';
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
