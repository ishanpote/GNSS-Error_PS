/**
 * script.js – GNSS Error Prediction  |  Enhanced UI
 *
 * Architecture
 * ────────────
 * DOMAINS      – declarative config; add one object to add a tab
 * buildForm()  – renders drag-drop zone + number inputs per domain
 * initTabs()   – pill-style tab switching with smooth transitions
 * checkAPI()   – live backend health-check → header status badge
 * handleSubmit – validation → progress steps → fetch → toast + results
 * renderResults – stat summary cards + paginated table with heat-bars
 * downloadCSV  – fetch blob → trigger browser download
 */

"use strict";

/* ════════════════════════════════════════════════════════════
   DOMAIN CONFIGURATION  –  add a new object here to extend
   ════════════════════════════════════════════════════════════ */
const DOMAINS = [
  {
    id: "defense",
    label: "Defense",
    accentVar: "--defense",
  },
  {
    id: "telecommunication",
    label: "Telecommunication",
    accentVar: "--telecom",
  },
  {
    id: "aviation",
    label: "Aviation",
    accentVar: "--aviation",
  },
];

const API_BASE        = `${window.location.origin}/api`;
const ROWS_PER_PAGE   = 25;

/* per-domain pagination state */
const paginationState = {};

/* ════════════════════════════════════════════════════════════
   1. FORM BUILDER  –  drag-drop zone + config inputs
   ════════════════════════════════════════════════════════════ */
function buildForm(domainId) {
  const container = document.getElementById(`form-${domainId}`);
  if (!container) return;

  container.innerHTML = `
    <form class="prediction-form" id="predict-form-${domainId}" novalidate>

      <div class="form-section-title">1 — Upload Data</div>

      <!-- Drag-and-drop zone -->
      <div class="dropzone" id="dz-${domainId}">
        <input type="file" id="file-${domainId}" name="file" accept=".csv" tabindex="-1" />
        <div class="dropzone-icon">&#128196;</div>
        <div class="dropzone-main">Drag &amp; drop your CSV here, or <u>click to browse</u></div>
        <div class="dropzone-sub">Accepted: .csv files only</div>
        <div class="dropzone-file-info" id="dz-info-${domainId}">
          <span>&#10003;</span>
          <span id="dz-filename-${domainId}">file.csv</span>
        </div>
      </div>

      <div class="file-hint">
        Required columns:
        <code>utc_time</code>
        <code>x_error(m)</code>
        <code>y_error(m)</code>
        <code>z_error(m)</code>
        <code>satclockerror(m)</code>
      </div>

      <div class="form-section-title" style="margin-top:.4rem">2 — Configure Prediction</div>

      <div class="form-row">
        <div class="form-group">
          <label for="past-${domainId}">
            <span>&#128197;</span> Past days (sequence)
          </label>
          <div class="input-wrap">
            <span class="input-icon">&#128197;</span>
            <input type="number" id="past-${domainId}" name="n_past_days"
              value="7" min="1" max="30" step="1" />
          </div>
          <span class="input-hint">How many past days to feed into the model</span>
        </div>

        <div class="form-group">
          <label for="future-${domainId}">
            <span>&#9193;</span> Future days to predict
          </label>
          <div class="input-wrap">
            <span class="input-icon">&#9193;</span>
            <input type="number" id="future-${domainId}" name="n_future_days"
              value="1" min="1" max="7" step="1" />
          </div>
          <span class="input-hint">Number of days ahead to forecast</span>
        </div>
      </div>

      <!-- Hidden domain field -->
      <input type="hidden" name="domain" value="${domainId}" />

      <!-- Progress steps (shown during prediction) -->
      <div class="progress-steps hidden" id="steps-${domainId}">
        <div class="step" id="step-${domainId}-0">
          <div class="step-dot">1</div>
          <div class="step-label">Preparing</div>
        </div>
        <div class="step" id="step-${domainId}-1">
          <div class="step-dot">2</div>
          <div class="step-label">Loading Models</div>
        </div>
        <div class="step" id="step-${domainId}-2">
          <div class="step-dot">3</div>
          <div class="step-label">Forecasting</div>
        </div>
        <div class="step" id="step-${domainId}-3">
          <div class="step-dot">4</div>
          <div class="step-label">Ensemble</div>
        </div>
        <div class="step" id="step-${domainId}-4">
          <div class="step-dot">&#10003;</div>
          <div class="step-label">Complete</div>
        </div>
      </div>

      <button type="submit" class="btn-predict" id="btn-${domainId}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Run Prediction</span>
      </button>

    </form>
  `;

  /* Drag-and-drop wiring */
  const dz    = document.getElementById(`dz-${domainId}`);
  const fi    = document.getElementById(`file-${domainId}`);
  const dzInfo = document.getElementById(`dz-info-${domainId}`);
  const dzName = document.getElementById(`dz-filename-${domainId}`);

  dz.addEventListener("dragover",  (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
  dz.addEventListener("dragleave", ()  => dz.classList.remove("drag-over"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files.length) {
      setFileInput(fi, dzInfo, dzName, files[0]);
    }
  });

  fi.addEventListener("change", () => {
    if (fi.files.length) setFileInput(fi, dzInfo, dzName, fi.files[0]);
  });

  /* form submit */
  document.getElementById(`predict-form-${domainId}`)
    .addEventListener("submit", (e) => handleSubmit(e, domainId));
}

function setFileInput(input, infoEl, nameEl, file) {
  /* Programmatically assign the file to the real input via DataTransfer */
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  } catch (_) { /* Safari fallback – file was already set natively */ }
  nameEl.textContent = file.name;
  infoEl.classList.add("show");
}

/* ════════════════════════════════════════════════════════════
   2. TAB SWITCHING
   ════════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("aria-controls");

      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.remove("active");
        p.hidden = true;
      });

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      const panel = document.getElementById(targetId);
      if (panel) { panel.classList.add("active"); panel.hidden = false; }
    });
  });
}

/* ════════════════════════════════════════════════════════════
   3. API HEALTH CHECK
   ════════════════════════════════════════════════════════════ */
async function checkAPI() {
  const statusEl = document.getElementById("api-status");
  const dotEl    = document.getElementById("api-dot");
  const textEl   = document.getElementById("api-status-text");
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      statusEl.className = "api-status online";
      dotEl.style.cssText = "";
      textEl.textContent  = "Backend Online";
    } else {
      throw new Error("non-ok");
    }
  } catch {
    statusEl.className = "api-status offline";
    textEl.textContent  = "Backend Offline";
  }
}

/* ════════════════════════════════════════════════════════════
   4. FORM SUBMIT  →  PROGRESS ANIMATION  →  FETCH
   ════════════════════════════════════════════════════════════ */
async function handleSubmit(event, domainId) {
  event.preventDefault();

  const form      = document.getElementById(`predict-form-${domainId}`);
  const btn       = document.getElementById(`btn-${domainId}`);
  const stepsEl   = document.getElementById(`steps-${domainId}`);
  const resultsEl = document.getElementById(`results-${domainId}`);
  const fileInput = document.getElementById(`file-${domainId}`);

  if (!fileInput.files.length) {
    showToast("error", "Please select or drop a CSV file first.");
    return;
  }

  /* Reset + show progress */
  resultsEl.classList.add("hidden");
  stepsEl.classList.remove("hidden");
  setStepState(domainId, 0, "active");
  setLoading(btn, true);

  const formData = new FormData(form);

  /* Simulated progress tick */
  const t1 = setTimeout(() => setStepState(domainId, 1, "active"), 600);
  const t2 = setTimeout(() => setStepState(domainId, 2, "active"), 1400);
  const t3 = setTimeout(() => setStepState(domainId, 3, "active"), 2200);

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

    if (!response.ok || data.status === "error") {
      resetSteps(domainId);
      stepsEl.classList.add("hidden");
      showToast("error", data.message || "An unknown server error occurred.");
      return;
    }

    /* Mark all steps done */
    [0,1,2,3,4].forEach((i) => setStepState(domainId, i, "done"));
    setTimeout(() => {
      stepsEl.classList.add("hidden");
      resetSteps(domainId);
    }, 1200);

    showToast("success", `&#10003; ${data.message}`);
    renderResults(domainId, data);

  } catch (err) {
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    resetSteps(domainId);
    stepsEl.classList.add("hidden");
    showToast("error", `Network error: ${err.message}. Is the backend running?`);
  } finally {
    setLoading(btn, false);
  }
}

/* ════════════════════════════════════════════════════════════
   5. RENDER RESULTS  –  stat cards + paginated heat-bar table
   ════════════════════════════════════════════════════════════ */
const NUM_COLS = new Set(["x_error(m)", "y_error(m)", "z_error(m)", "satclockerror(m)"]);
const COL_COLORS = {
  "x_error(m)":      "rgba(61,155,255,.15)",
  "y_error(m)":      "rgba(255,140,66,.15)",
  "z_error(m)":      "rgba(45,212,135,.15)",
  "satclockerror(m)":"rgba(180,100,255,.15)",
};

function renderResults(domainId, data) {
  const container = document.getElementById(`results-${domainId}`);
  const rows      = data.preview_rows || [];
  if (!rows.length) { container.classList.add("hidden"); return; }

  const colNames = Object.keys(rows[0]);
  paginationState[domainId] = { page: 0, rows, colNames };

  /* Compute per-column min/max for heat-bars */
  const colStats = {};
  NUM_COLS.forEach((c) => {
    const vals = rows.map((r) => r[c]).filter((v) => typeof v === "number");
    colStats[c] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / (vals.length || 1),
    };
  });

  /* Build stat cards */
  const statHTML = [...NUM_COLS]
    .filter((c) => colStats[c])
    .map((c) => {
      const s = colStats[c];
      const color = (COL_COLORS[c] || "").replace(".15", ".6");
      return `
        <div class="stat-card">
          <div class="stat-card-label" style="color:${color.replace("rgba","rgb").replace(",.6)",",")}">
            ${escapeHtml(c)}
          </div>
          <div class="stat-card-value">${fmt(s.avg)}</div>
          <div class="stat-card-sub">avg &nbsp;|&nbsp; min ${fmt(s.min)} &nbsp;|&nbsp; max ${fmt(s.max)}</div>
        </div>`;
    }).join("");

  /* Total rows info */
  const total = rows.length;

  container.innerHTML = `
    <div class="results-header">
      <div>
        <h3>Forecast Results</h3>
        <div class="results-meta">${total} rows · domain: <strong>${escapeHtml(data.domain)}</strong></div>
      </div>
      <button class="btn-download" onclick="downloadCSV('${domainId}')">
        &#8681;&nbsp; Download CSV
      </button>
    </div>

    <!-- Stat cards -->
    <div class="stat-cards">${statHTML}</div>

    <!-- Legend -->
    <div class="col-legend">
      ${[...NUM_COLS].map((c) => `
        <div class="col-legend-item">
          <span class="col-legend-dot"
            style="background:${(COL_COLORS[c] || "rgba(100,100,100,.4)").replace(".15","1")}">
          </span>
          <span>${escapeHtml(c)}</span>
        </div>`).join("")}
    </div>

    <!-- Table  -->
    <div class="table-wrapper">
      <div id="table-body-${domainId}"></div>
      <div class="table-pagination" id="pagination-${domainId}"></div>
    </div>
  `;

  /* Render first page */
  renderPage(domainId, colStats);
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPage(domainId, colStats) {
  const state    = paginationState[domainId];
  const { page, rows, colNames } = state;
  const start    = page * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);
  const total    = rows.length;
  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  /* Table */
  const tableEl = document.getElementById(`table-body-${domainId}`);
  tableEl.innerHTML = `
    <table class="preview-table">
      <thead>
        <tr>
          <th>#</th>
          ${colNames.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${pageRows.map((row, i) => {
          const rowNum = start + i + 1;
          const cells = colNames.map((c) => {
            const val = row[c];
            if (c === "utc_time" || c === "domain") {
              const cls = c === "utc_time" ? "ts" : "domain-badge";
              return `<td class="${cls}">${c === "domain" ? `<span>${escapeHtml(String(val ?? ""))}</span>` : escapeHtml(String(val ?? ""))}</td>`;
            }
            if (NUM_COLS.has(c) && typeof val === "number" && colStats && colStats[c]) {
              const s      = colStats[c];
              const range  = (s.max - s.min) || 1;
              const pct    = ((val - s.min) / range) * 100;
              const bg     = COL_COLORS[c] || "rgba(61,155,255,.1)";
              return `<td class="num">
                <div class="heat-bar" style="width:${pct.toFixed(1)}%;background:${bg}"></div>
                <span>${val.toFixed(6)}</span>
              </td>`;
            }
            return `<td>${escapeHtml(String(val ?? ""))}</td>`;
          }).join("");
          return `<tr><td style="color:var(--text-3);font-size:.75rem;font-family:'JetBrains Mono',monospace">${rowNum}</td>${cells}</tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  /* Pagination bar */
  const pagEl = document.getElementById(`pagination-${domainId}`);
  pagEl.innerHTML = `
    <span>Showing ${start + 1}–${Math.min(start + ROWS_PER_PAGE, total)} of ${total} rows</span>
    <div class="pagination-btns">
      <button class="btn-page" onclick="changePage('${domainId}',-1,null)"
        ${page === 0 ? "disabled" : ""}>&#8592; Prev</button>
      <button class="btn-page" style="pointer-events:none;opacity:.5">${page + 1} / ${totalPages}</button>
      <button class="btn-page" onclick="changePage('${domainId}',1,null)"
        ${page >= totalPages - 1 ? "disabled" : ""}>Next &#8594;</button>
    </div>
  `;
}

function changePage(domainId, delta, _colStats) {
  const state = paginationState[domainId];
  if (!state) return;
  const total = state.rows.length;
  const totalPages = Math.ceil(total / ROWS_PER_PAGE);
  state.page = Math.max(0, Math.min(state.page + delta, totalPages - 1));

  /* Re-compute colStats from state.rows */
  const colStats = {};
  NUM_COLS.forEach((c) => {
    const vals = state.rows.map((r) => r[c]).filter((v) => typeof v === "number");
    colStats[c] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / (vals.length || 1),
    };
  });

  renderPage(domainId, colStats);
}

/* ════════════════════════════════════════════════════════════
   6. CSV DOWNLOAD
   ════════════════════════════════════════════════════════════ */
function downloadCSV(domainId) {
  const form = document.getElementById(`predict-form-${domainId}`);
  if (!form) return;
  const formData = new FormData(form);

  showToast("info", "Preparing download…");

  fetch(`${API_BASE}/predict/download`, { method: "POST", body: formData })
    .then((res) => {
      if (!res.ok) throw new Error(`Server ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `gnss_predictions_${domainId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => showToast("error", `Download failed: ${err.message}`));
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════ */

function setLoading(btn, on) {
  btn.disabled  = on;
  btn.innerHTML = on
    ? `<span class="spinner"></span> <span>Running…</span>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Run Prediction</span>`;
}

function setStepState(domainId, stepIdx, state) {
  /* Mark all lower steps as done, current as active */
  for (let i = 0; i <= stepIdx; i++) {
    const el = document.getElementById(`step-${domainId}-${i}`);
    if (!el) continue;
    if (i < stepIdx) { el.classList.remove("active"); el.classList.add("done"); }
    else { el.classList.remove("done"); el.classList.add(state); }
  }
}

function resetSteps(domainId) {
  for (let i = 0; i < 5; i++) {
    const el = document.getElementById(`step-${domainId}-${i}`);
    if (el) { el.classList.remove("active","done"); }
  }
}

function showToast(type, message) {
  const container = document.getElementById("toast-container");
  const icons = { success: "&#10003;", error: "&#9888;", info: "&#8505;" };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || ""}</span>
    <span class="toast-msg">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 4500);
}

function fmt(n) {
  return typeof n === "number" ? n.toFixed(5) : n;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  DOMAINS.forEach((d) => buildForm(d.id));
  initTabs();
  checkAPI();
  /* Re-check API status every 30 seconds */
  setInterval(checkAPI, 30_000);
});
