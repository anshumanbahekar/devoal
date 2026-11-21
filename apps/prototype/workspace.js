const workspaceNotesKey = "dv-problem-notes.v1";
const workspaceCheckpointsKey = "dv-code-checkpoints.v1";

function readWorkspaceMap(key) {
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function mountProblemWorkspace(article, language, problemId, editorId) {
  const problemKey = language + "/" + problemId;
  const panel = document.createElement("section");
  panel.className = "problem-workspace";
  panel.innerHTML = `<details class="workspace-notes"><summary>My notes</summary>
    <label>Approach, edge cases, and what to revisit
      <textarea class="workspace-note" maxlength="6000" rows="5" placeholder="What helped you solve this problem?"></textarea>
    </label><p class="workspace-status" role="status"></p></details>
    <details class="workspace-versions"><summary>Solution checkpoints</summary>
    <p class="why">Save a working version before trying another approach. Restoring also keeps a copy of your current code.</p>
    <div class="workspace-save"><input aria-label="Checkpoint name" maxlength="60" placeholder="e.g. Two-pointer approach">
    <button class="btn off" type="button">Save checkpoint</button></div>
    <div class="workspace-checkpoints"></div><p class="workspace-status" role="status"></p></details>`;
  article.append(panel);
  const notes = panel.querySelector(".workspace-note");
  const noteStatus = panel.querySelector(".workspace-notes .workspace-status");
  const checkpointStatus = panel.querySelector(".workspace-versions .workspace-status");
  const list = panel.querySelector(".workspace-checkpoints");
  const name = panel.querySelector(".workspace-save input");
  let initialNote;
  try {
    initialNote = readWorkspaceMap(workspaceNotesKey)[problemKey];
    notes.value = typeof initialNote?.text === "string" ? initialNote.text : "";
    panel.querySelector(".workspace-notes").open = Boolean(notes.value);
  } catch {
    noteStatus.textContent = "Notes could not load. Browser storage may be unavailable.";
  }
  notes.addEventListener("input", () => {
    try {
      const data = readWorkspaceMap(workspaceNotesKey);
      data[problemKey] = {text: notes.value, updatedAt: Date.now()};
      localStorage.setItem(workspaceNotesKey, JSON.stringify(data));
      noteStatus.textContent = "Saved in this browser.";
    } catch {
      noteStatus.textContent = "Could not save. Copy your note before leaving this page.";
    }
  });

  function checkpoints() {
    const entries = readWorkspaceMap(workspaceCheckpointsKey)[problemKey];
    return Array.isArray(entries) ? entries.filter(item => item && typeof item.id === "string" &&
      typeof item.code === "string" && typeof item.name === "string" && Number.isFinite(item.at)) : [];
  }

  function storeCheckpoint(code, title) {
    const data = readWorkspaceMap(workspaceCheckpointsKey);
    const rows = checkpoints();
    if (rows.some(row => row.code === code)) return;
    rows.push({id: crypto.randomUUID(), code, name: title || "Checkpoint " + (rows.length + 1), at: Date.now()});
    data[problemKey] = rows;
    localStorage.setItem(workspaceCheckpointsKey, JSON.stringify(data));
  }

  function drawCheckpoints() {
    list.replaceChildren();
    try {
      const rows = checkpoints();
      if (!rows.length) {
        list.textContent = "Your saved versions will appear here.";
        return;
      }
      for (const row of rows.slice().reverse()) {
        const item = document.createElement("div");
        item.className = "workspace-checkpoint";
        const label = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = row.name;
        const date = document.createElement("small");
        date.textContent = new Date(row.at).toLocaleString();
        label.append(title, date);
        const restore = document.createElement("button");
        restore.type = "button";
        restore.className = "btn off";
        restore.textContent = "Restore";
        restore.setAttribute("aria-label", "Restore " + row.name);
        restore.onclick = () => {
          const editor = document.getElementById(editorId);
          if (!editor) return;
          try {
            storeCheckpoint(editor.value, "Before restoring " + row.name);
            editor.value = row.code;
            editor.dispatchEvent(new Event("input", {bubbles: true}));
            checkpointStatus.textContent = "Checkpoint restored. Your previous code is saved.";
            drawCheckpoints();
            editor.focus();
          } catch {
            checkpointStatus.textContent = "Could not save your current code. Free browser storage and try again.";
          }
        };
        const preview = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "View code";
        const code = document.createElement("pre");
        code.className = "mono";
        code.textContent = row.code;
        preview.append(summary, code);
        item.append(label, restore, preview);
        list.append(item);
      }
    } catch {
      checkpointStatus.textContent = "Checkpoints could not load. Browser storage may be unavailable.";
    }
  }
  panel.querySelector(".workspace-save button").onclick = () => {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    try {
      storeCheckpoint(editor.value, name.value.trim());
      name.value = "";
      checkpointStatus.textContent = "Current code saved as a checkpoint.";
      drawCheckpoints();
    } catch {
      checkpointStatus.textContent = "Could not save a checkpoint. Export a backup from Progress and free browser storage.";
    }
  };
  drawCheckpoints();
}
