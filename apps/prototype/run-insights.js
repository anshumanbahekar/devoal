/* Runtime comparisons use only this learner's comparable, successful runs. */
function runInsightsHtml(id, outcome = {}) {
  const safe = value => String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
  const measured = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const count = value => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const milliseconds = value => value > 0 && value < .01 ? "<0.01" : value >= 1_000_000 ? value.toExponential(2) : value.toLocaleString(undefined, {maximumFractionDigits: 2});
  const total = count(outcome.testsTotal);
  const passedTests = Math.min(total, count(outcome.testsPassed));
  const passed = outcome.passed === true;
  const hasRuntime = measured(outcome.runtimeMs);
  const benchmark = typeof outcome.benchmark === "string" ? outcome.benchmark : "";
  const recordedAt = measured(outcome.at) && outcome.at <= 8_640_000_000_000_000 ? outcome.at : null;
  let history = [];
  try {
    const attempts = typeof readAttempts === "function" ? readAttempts() : [];
    if (Array.isArray(attempts) && benchmark) {
      history = attempts.filter(row => row && row.id === id && row.benchmark === benchmark &&
        measured(row.runtimeMs) && measured(row.at) && row.at <= 8_640_000_000_000_000 &&
        typeof row.passed === "boolean" && (recordedAt === null || row.at < recordedAt)).sort((a, b) => a.at - b.at);
    }
  } catch { /* A result can still be displayed when saved history is unavailable. */ }
  const successful = history.filter(row => row.passed);
  let comparison = "Complete all tests to compare successful runs.";
  let sample = "Failed runs are shown in the chart, but excluded from speed comparisons.";
  if (!hasRuntime) {
    comparison = "Runtime unavailable for this run.";
    sample = "Run the tests again to collect a local measurement.";
  } else if (passed && !successful.length) {
    comparison = "First successful benchmark";
    sample = "Your next successful run can be compared with this result.";
  } else if (passed) {
    const faster = Math.round(successful.filter(row => row.runtimeMs > outcome.runtimeMs).length / successful.length * 100);
    comparison = `Faster than ${faster}% of your previous successful runs`;
    sample = `Compared with ${successful.length} successful ${successful.length === 1 ? "run" : "runs"} of this problem using the same benchmark. Ties are not counted as faster.`;
  }
  const runs = history.map(row => ({runtimeMs: row.runtimeMs, passed: row.passed, at: row.at, current: false}));
  if (hasRuntime) runs.push({runtimeMs: outcome.runtimeMs, passed, at: recordedAt ?? Date.now(), current: true});
  const recent = runs.slice(-12);
  let chart = '<p class="run-empty">Measured runs will appear here after your tests finish.</p>';
  if (recent.length) {
    const ceiling = Math.max(.01, ...recent.map(row => row.runtimeMs));
    const points = recent.map((row, index) => ({...row,
      x: recent.length === 1 ? 262 : 50 + index / (recent.length - 1) * 424,
      y: 140 - row.runtimeMs / ceiling * 106
    }));
    const line = points.map(row => `${row.x.toFixed(2)},${row.y.toFixed(2)}`).join(" ");
    const markers = points.map((row, index) => {
      const title = `Run ${index + 1}${row.current ? " (current)" : ""}: ${milliseconds(row.runtimeMs)} ms, ${row.passed ? "passed" : "failed"}`;
      const x = row.x.toFixed(2), y = row.y.toFixed(2);
      const shape = row.passed
        ? `<circle cx="${x}" cy="${y}" r="4.5"/>`
        : `<path d="M${(row.x - 4).toFixed(2)} ${(row.y - 4).toFixed(2)}l8 8m0 -8l-8 8"/>`;
      return `<g class="${row.passed ? "run-point-pass" : "run-point-fail"}"><title>${safe(title)}</title>${row.current ? `<circle class="run-current-ring" cx="${x}" cy="${y}" r="8"/>` : ""}${shape}</g>`;
    }).join("");
    const rows = recent.map((row, index) => `<tr><th scope="row">${index + 1}${row.current ? " · current" : ""}</th><td>${safe(new Date(row.at).toLocaleString())}</td><td>${safe(milliseconds(row.runtimeMs))} ms</td><td>${row.passed ? "Passed" : "Failed"}</td></tr>`).join("");
    chart = `<svg class="run-chart" viewBox="0 0 500 178" role="img" aria-label="Runtime in milliseconds for ${recent.length} recent measured ${recent.length === 1 ? "run" : "runs"}. Detailed values follow the chart.">
      <title>Recent local run times in milliseconds</title>
      <path class="run-chart-grid" d="M50 34H474M50 87H474M50 140H474"/>
      <text x="474" y="18" text-anchor="end">Max ${safe(milliseconds(ceiling))} ms</text>
      <text x="44" y="144" text-anchor="end">0</text><text x="50" y="18">ms</text>
      ${points.length > 1 ? `<polyline class="run-chart-line" points="${line}"/>` : ""}${markers}
      <text x="50" y="165">${recent.length === 1 ? "" : "Earlier"}</text><text x="474" y="165" text-anchor="end">${recent.at(-1).current ? "Current run" : "Latest measured run"}</text>
    </svg>
    <details class="run-data"><summary>View run data</summary><div class="run-table-scroll"><table><caption>Recent measured runs for this problem</caption><thead><tr><th scope="col">Run</th><th scope="col">Time</th><th scope="col">Runtime</th><th scope="col">Result</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
  return `<section class="run-insights" aria-label="Run performance">
    <div class="run-insights-heading"><h4>Run performance</h4><span class="run-verdict ${passed ? "is-passed" : "is-failed"}">${passed ? "All tests passed" : "Needs another try"}</span></div>
    <dl class="run-metrics">
      <div><dt>Test runtime</dt><dd>${hasRuntime ? safe(milliseconds(outcome.runtimeMs)) + '<small>ms</small>' : '<span class="run-unavailable">Unavailable</span>'}</dd></div>
      <div><dt>Tests passed</dt><dd>${passedTests}<small>/ ${total}</small></dd></div>
      <div><dt>Test success</dt><dd>${total ? Math.round(passedTests / total * 100) + '<small>%</small>' : '<span class="run-unavailable">Unavailable</span>'}</dd></div>
    </dl>
    <p class="run-comparison">${safe(comparison)}</p><p class="run-sample">${safe(sample)}</p>
    <div class="run-chart-heading"><h5>Recent measured runs</h5><span class="run-legend"><span><i class="run-pass-key" aria-hidden="true"></i>Passed</span><span><i class="run-fail-key" aria-hidden="true">×</i>Failed</span></span></div>
    ${chart}
    <p class="run-method">Local browser test execution, excluding runtime startup. Timings vary by device. Failed runs may finish earlier.</p>
  </section>`;
}
