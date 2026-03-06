// modules/flourPickerModal.js
import { loadFloursForBrowser } from "./floursDb.js";

export async function openFlourPickerModal(store, opts = {}) {
  const onUse = typeof opts.onUse === "function" ? opts.onUse : () => {};

  const flours = await loadFloursForBrowser(window.__PDT_STORE__ || store);

  // Modal shell
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,.55)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const box = document.createElement("div");
  box.style.width = "min(1000px, 92vw)";
  box.style.maxHeight = "86vh";
  box.style.overflow = "auto";
  box.style.background = "var(--panel, #181a1d)";
  box.style.border = "1px solid rgba(255,255,255,.08)";
  box.style.borderRadius = "16px";
  box.style.boxShadow = "0 20px 80px rgba(0,0,0,.6)";
  box.style.padding = "16px";
  overlay.appendChild(box);

  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
      <div>
        <div style="font-size:18px;font-weight:700;">Choose Flour</div>
        <div style="opacity:.7;font-size:13px;">Click a flour to view details, then “Use Flour”.</div>
      </div>
      <button id="fpClose" class="btn">Close</button>
    </div>

    <div style="display:flex;gap:10px;align-items:center;margin-top:12px;">
      <input id="fpSearch" class="input" placeholder="Search flour…" style="flex:1;">
      <select id="fpSort" class="input" style="width:180px;">
        <option value="popular">Popular</option>
        <option value="protein">Protein</option>
        <option value="absorption">Absorption</option>
        <option value="name">Name</option>
      </select>
    </div>

    <div id="fpGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:14px;"></div>
  `;

  const closeBtn = box.querySelector("#fpClose");
  closeBtn.addEventListener("click", close);

  const searchEl = box.querySelector("#fpSearch");
  const sortEl = box.querySelector("#fpSort");
  const gridEl = box.querySelector("#fpGrid");

  function render() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const sort = sortEl.value;

    let list = flours.filter(f => {
      const hay = `${f.brand} ${f.name} ${f.type}`.toLowerCase();
      return !q || hay.includes(q);
    });

    if (sort === "protein") list.sort((a,b) => (b.protein ?? 0) - (a.protein ?? 0));
    else if (sort === "absorption") list.sort((a,b) => (b.absorption ?? 0) - (a.absorption ?? 0));
    else if (sort === "name") list.sort((a,b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));

    gridEl.innerHTML = "";
    for (const f of list) gridEl.appendChild(card(f));
  }

  function card(f) {
    const el = document.createElement("div");
    el.className = "card";
    el.style.cursor = "pointer";
    el.style.padding = "14px";
    el.style.borderRadius = "14px";
    el.style.border = "1px solid rgba(255,255,255,.08)";
    el.style.background = "rgba(255,255,255,.02)";

    const absPct = (f.absorption != null) ? Math.round(f.absorption * 100) : null;

    el.innerHTML = `
      <div style="font-weight:700;">${escapeHtml(f.brand)} • ${escapeHtml(f.name)}</div>
      <div style="opacity:.75;margin-top:6px;">
        ${escapeHtml(f.type || "")}
        ${f.protein != null ? ` • Protein ${Number(f.protein).toFixed(1)}%` : ""}
        ${absPct != null ? ` • Abs ${absPct}%` : ""}
      </div>
    `;

    el.addEventListener("click", () => openDetail(f));
    return el;
  }

  function openDetail(f) {
    // simple “detail popup” inside the modal
    const abs = f.absorptionRange?.minPct != null
      ? `${f.absorptionRange.minPct}–${f.absorptionRange.maxPct}%`
      : "—";

    const heat = f.heat?.tempF?.min != null
      ? `${fmtNum(f.heat.tempF.min)}–${fmtNum(f.heat.tempF.max)}°F`
      : "—";

    const specs = f.specs || {};
    const w = specs.w?.min != null ? `${specs.w.min}–${specs.w.max}` : "—";
    const pl = specs.pl?.min != null ? `${specs.pl.min}–${specs.pl.max}` : "—";

    const panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.inset = "0";
    panel.style.background = "rgba(0,0,0,.55)";
    panel.style.zIndex = "10000";
    panel.style.display = "flex";
    panel.style.alignItems = "center";
    panel.style.justifyContent = "center";
    panel.addEventListener("click", (e) => { if (e.target === panel) panel.remove(); });

    const inner = document.createElement("div");
    inner.style.width = "min(560px, 92vw)";
    inner.style.background = "var(--panel, #181a1d)";
    inner.style.border = "1px solid rgba(255,255,255,.08)";
    inner.style.borderRadius = "16px";
    inner.style.boxShadow = "0 20px 80px rgba(0,0,0,.6)";
    inner.style.padding = "16px";
    panel.appendChild(inner);

    inner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="font-weight:800;font-size:18px;">${escapeHtml(f.brand)} • ${escapeHtml(f.name)}</div>
        <button class="btn" id="fpDetailClose">Close</button>
      </div>

      <div style="opacity:.8;margin-top:8px;">
        Type: ${escapeHtml(f.type || "—")}
      </div>

      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><div style="opacity:.7;font-size:12px;">Protein</div><div style="font-weight:700;">${f.protein != null ? `${Number(f.protein).toFixed(2)}%` : "—"}</div></div>
        <div><div style="opacity:.7;font-size:12px;">Absorption</div><div style="font-weight:700;">${abs}</div></div>
        <div><div style="opacity:.7;font-size:12px;">W</div><div style="font-weight:700;">${w}</div></div>
        <div><div style="opacity:.7;font-size:12px;">P/L</div><div style="font-weight:700;">${pl}</div></div>
        <div><div style="opacity:.7;font-size:12px;">Malted</div><div style="font-weight:700;">${f.malted === true ? "Yes" : f.malted === false ? "No" : "—"}</div></div>
        <div><div style="opacity:.7;font-size:12px;">Heat band</div><div style="font-weight:700;">${heat}</div></div>
      </div>

      <div style="opacity:.75;margin-top:10px;font-size:13px;">${escapeHtml(f.notes || "")}</div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button class="btn" id="fpUse">Use Flour</button>
      </div>
    `;

    inner.querySelector("#fpDetailClose").addEventListener("click", () => panel.remove());
    inner.querySelector("#fpUse").addEventListener("click", () => {
      onUse(f._raw || f); // pass raw DB record if available
      panel.remove();
      close();
    });

    document.body.appendChild(panel);
  }

  function close() {
    overlay.remove();
  }

  searchEl.addEventListener("input", render);
  sortEl.addEventListener("change", render);

  document.body.appendChild(overlay);
  render();
}

function fmtNum(n) {
  if (n == null) return "—";
  const v = Number(n);
  return Number.isFinite(v) ? String(Math.round(v)) : "—";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}