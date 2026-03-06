import { loadFloursForBrowser } from "./floursDb.js";

export async function openFlourPickerModal(store, opts = {}) {
  const onUse = typeof opts.onUse === "function" ? opts.onUse : () => {};
  const flours = await loadFloursForBrowser(window.__PDT_STORE__ || store);

  let activeSort = "name";
  let activeSearch = "";
  let activeType = "all";
  const selectedIds = new Set();

  const overlay = document.createElement("div");
  overlay.className = "fpOverlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const box = document.createElement("div");
  box.className = "fpModal";
  overlay.appendChild(box);

  box.innerHTML = `
    <div class="fpHead">
      <div>
        <div class="fpEyebrow">Flour Browser</div>
        <h3 class="fpTitle">Choose Flour</h3>
        <p class="fpSub">Pick one or more flours for your blend, then click Done.</p>
      </div>

      <div class="fpHeadActions">
        <button type="button" class="btn ghost sm" id="fpDone">Done</button>
        <button type="button" class="btn ghost sm" id="fpClose">Close</button>
      </div>
    </div>

    <div class="fpToolbar">
      <input id="fpSearch" class="input fpSearch" placeholder="Search by brand, name, or type..." />

      <select id="fpSort" class="input fpSelect">
        <option value="name">Sort: Name</option>
        <option value="protein">Sort: Protein</option>
        <option value="absorption">Sort: Absorption</option>
      </select>
    </div>

    <div class="fpFilters" id="fpFilters">
      <button type="button" class="fpChip active" data-type="all">All</button>
      <button type="button" class="fpChip" data-type="00">00</button>
      <button type="button" class="fpChip" data-type="0">0</button>
      <button type="button" class="fpChip" data-type="Bread">Bread</button>
      <button type="button" class="fpChip" data-type="High Gluten">High Gluten</button>
      <button type="button" class="fpChip" data-type="AP/Bread">AP/Bread</button>
      <button type="button" class="fpChip" data-type="Manitoba">Manitoba</button>
    </div>

    <div class="fpMeta" id="fpMeta"></div>

    <div class="fpScroll">
      <div class="tplGrid fpTplGrid" id="fpGrid"></div>
    </div>
  `;

  const closeBtn = box.querySelector("#fpClose");
  const doneBtn = box.querySelector("#fpDone");
  const searchEl = box.querySelector("#fpSearch");
  const sortEl = box.querySelector("#fpSort");
  const gridEl = box.querySelector("#fpGrid");
  const metaEl = box.querySelector("#fpMeta");
  const filtersEl = box.querySelector("#fpFilters");

  closeBtn.addEventListener("click", close);
  doneBtn.addEventListener("click", done);

  searchEl.addEventListener("input", () => {
    activeSearch = searchEl.value || "";
    render();
  });

  sortEl.addEventListener("change", () => {
    activeSort = sortEl.value || "name";
    render();
  });

  filtersEl.querySelectorAll(".fpChip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeType = btn.dataset.type || "all";
      filtersEl.querySelectorAll(".fpChip").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  function render() {
    const q = activeSearch.trim().toLowerCase();

    let list = flours.filter((f) => {
      const hay = `${f.brand || ""} ${f.name || ""} ${f.type || ""}`.toLowerCase();
      const typeOk =
        activeType === "all"
          ? true
          : String(f.type || "").toLowerCase() === activeType.toLowerCase();
      const searchOk = !q || hay.includes(q);
      return typeOk && searchOk;
    });

    if (activeSort === "protein") {
      list.sort((a, b) => (Number(readProtein(b)) || 0) - (Number(readProtein(a)) || 0));
    } else if (activeSort === "absorption") {
      list.sort((a, b) => readAbsMid(b) - readAbsMid(a));
    } else {
      list.sort((a, b) =>
        `${a.brand || ""} ${a.name || ""}`.localeCompare(`${b.brand || ""} ${b.name || ""}`)
      );
    }

    metaEl.textContent = `${list.length} flours found • ${selectedIds.size} selected`;

    gridEl.innerHTML = "";

    if (!list.length) {
      gridEl.innerHTML = `<div class="muted">No flours found.</div>`;
      return;
    }

    list.forEach((f) => gridEl.appendChild(flourTplCard(f)));
  }

  function flourTplCard(f) {
    const wrap = document.createElement("div");
    wrap.className = "tplCardWrap flourTplWrap";

    const selected = selectedIds.has(f.id);
    if (selected) wrap.classList.add("is-selected");

    const protein = readProtein(f);
    const abs = formatAbsCompact(f);
    const w = formatWCompact(f);

    wrap.title = [
      protein != null ? `Protein ${protein}%` : "Protein —",
      w,
      abs
    ].join(" • ");

    wrap.innerHTML = `
      <button type="button" class="tplTile flourTplTile">
        <div class="tplTileInner flourTplInner">
          <img src="${escapeAttr(f.logo || "./icons/flour.svg")}" alt="" />
        </div>
        <div class="tplTileMark ${selected ? "on" : ""}"></div>
      </button>

      <div class="tplCap flourTplCap">
        <div class="flourCardTop">
          <div>
            <div class="tplName flourTplName">${escapeHtml([f.brand, f.name].filter(Boolean).join(" "))}</div>
            <div class="tplSub flourTplSub">${escapeHtml(f.type || "—")}</div>
          </div>

          <button type="button" class="flourAdd" aria-label="Add flour">
            ${selected ? "✓" : "+"}
          </button>
        </div>
      </div>
    `;

    const toggle = () => {
      if (selectedIds.has(f.id)) selectedIds.delete(f.id);
      else selectedIds.add(f.id);
      render();
    };

    wrap.querySelector(".tplTile").addEventListener("click", toggle);
    wrap.querySelector(".flourAdd").addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    return wrap;
  }

  function done() {
    const picked = flours.filter((f) => selectedIds.has(f.id)).map((f) => f._raw || f);
    if (picked.length) onUse(picked);
    overlay.remove();
  }

  function close() {
    overlay.remove();
  }

  document.body.appendChild(overlay);
  render();
}

function readProtein(f) {
  return f?.protein ?? f?.proteinPct ?? null;
}

function readAbsMid(f) {
  const min = f?.absorptionRange?.minPct ?? f?.absorption?.minPct ?? null;
  const max = f?.absorptionRange?.maxPct ?? f?.absorption?.maxPct ?? null;
  if (min != null && max != null) return (Number(min) + Number(max)) / 2;
  if (min != null) return Number(min);
  return 0;
}

function formatWCompact(f) {
  const min = f?.specs?.w?.min;
  const max = f?.specs?.w?.max;
  if (min != null && max != null) return min === max ? `W ${min}` : `W ${min}–${max}`;
  if (min != null) return `W ${min}`;
  return "W —";
}

function formatAbsCompact(f) {
  const min = f?.absorptionRange?.minPct ?? f?.absorption?.minPct ?? null;
  const max = f?.absorptionRange?.maxPct ?? f?.absorption?.maxPct ?? null;
  if (min != null && max != null) return `Abs ${min}–${max}%`;
  if (min != null) return `Abs ${min}%`;
  return "Abs —";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}