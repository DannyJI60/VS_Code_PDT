// modules/flourPickerModal.js
import { loadFloursForBrowser } from "./floursDb.js";

export async function openFlourPickerModal(store, opts = {}) {
  const onUse = typeof opts.onUse === "function" ? opts.onUse : () => {};
  const flours = await loadFloursForBrowser(window.__PDT_STORE__ || store);

  let activeSort = "name";
  let activeSearch = "";
  let activeType = "all";
  let detailPanel = null;
  let selectedFlours = [];

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
        <p class="fpSub">Pick a flour for your blend. Open the detail card for specs and notes.</p>
      </div>

      <button type="button" class="btn ghost sm" id="fpClose">Close</button>
    </div>

    <div class="fpToolbar">
      <label class="fpSearchWrap">
        <input id="fpSearch" class="input fpSearch" placeholder="Search by brand, name, or type..." />
      </label>

      <select id="fpSort" class="input fpSelect">
        <option value="name">Name</option>
        <option value="protein">Protein</option>
        <option value="absorption">Absorption</option>
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

    <div class="fpBody">
      <div class="fpGrid" id="fpGrid"></div>

      <aside class="fpDetailShell" id="fpDetailShell">
        <div class="fpDetailEmpty">
          <div class="fpDetailEmptyTitle">Flour details</div>
          <div class="fpDetailEmptySub">Click a flour card to inspect specs and add it to the blend.</div>
        </div>
      </aside>
    </div>
  `;

  const closeBtn = box.querySelector("#fpClose");
  const searchEl = box.querySelector("#fpSearch");
  const sortEl = box.querySelector("#fpSort");
  const gridEl = box.querySelector("#fpGrid");
  const metaEl = box.querySelector("#fpMeta");
  const filtersEl = box.querySelector("#fpFilters");
  const detailShellEl = box.querySelector("#fpDetailShell");

  closeBtn.addEventListener("click", close);
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
      const hay = `${f.brand} ${f.name} ${f.type}`.toLowerCase();
      const typeOk = activeType === "all" ? true : String(f.type || "").toLowerCase() === activeType.toLowerCase();
      const searchOk = !q || hay.includes(q);
      return typeOk && searchOk;
    });

    if (activeSort === "protein") {
      list.sort((a, b) => (Number(b.protein) || 0) - (Number(a.protein) || 0));
    } else if (activeSort === "absorption") {
      list.sort((a, b) => (Number(b.absorption) || 0) - (Number(a.absorption) || 0));
    } else {
      list.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
    }

    metaEl.textContent = `${list.length} flour${list.length === 1 ? "" : "s"} found`;

    gridEl.innerHTML = "";
    list.forEach((f) => gridEl.appendChild(flourCard(f)));

    if (!list.length) {
      gridEl.innerHTML = `
        <div class="fpZero">
          <div class="fpZeroTitle">No flours found</div>
          <div class="fpZeroSub">Try a different search or clear the type filter.</div>
        </div>
      `;
    }
  }

  function flourCard(f){

  const el=document.createElement("div");
  el.className="flourCard";

  el.innerHTML=`
    <button class="flourAdd">+</button>

    <div class="flourLogo">
      <img src="${f.logo || "./icons/flour.svg"}">
    </div>

    <div class="flourName">${f.brand} ${f.name}</div>
    <div class="flourType">${f.type}</div>
  `;

  el.querySelector(".flourAdd").addEventListener("click",()=>{
      selectedFlours.push(f);
      updateSelectedIndicator(el);
  });

  return el;
}

  function openDetail(f, cardEl) {
    gridEl.querySelectorAll(".fpCard").forEach((x) => x.classList.remove("active"));
    cardEl.classList.add("active");

    const abs = formatAbsRange(f);
    const heat = formatHeat(f);
    const w = formatW(f);
    const pl = formatPL(f);
    const protein = f.protein != null ? `${Number(f.protein).toFixed(2)}%` : "—";
    const malted = f.malted === true ? "Yes" : f.malted === false ? "No" : "—";

    detailShellEl.innerHTML = `
      <div class="fpDetailCard">
        <div class="fpDetailHead">
          <div>
            <div class="fpEyebrow">${escapeHtml(f.brand || "Unknown Brand")}</div>
            <div class="fpDetailTitle">${escapeHtml(f.name || f.id || "Unnamed Flour")}</div>
          </div>
        </div>

        <div class="fpDetailType">${escapeHtml(f.type || "—")}</div>

        <div class="fpDetailGrid">
          <div class="fpDetailStat">
            <div class="fpDetailLabel">Protein</div>
            <div class="fpDetailValue">${escapeHtml(protein)}</div>
          </div>

          <div class="fpDetailStat">
            <div class="fpDetailLabel">Absorption</div>
            <div class="fpDetailValue">${escapeHtml(abs)}</div>
          </div>

          <div class="fpDetailStat">
            <div class="fpDetailLabel">W</div>
            <div class="fpDetailValue">${escapeHtml(w)}</div>
          </div>

          <div class="fpDetailStat">
            <div class="fpDetailLabel">P/L</div>
            <div class="fpDetailValue">${escapeHtml(pl)}</div>
          </div>

          <div class="fpDetailStat">
            <div class="fpDetailLabel">Malted</div>
            <div class="fpDetailValue">${escapeHtml(malted)}</div>
          </div>

          <div class="fpDetailStat">
            <div class="fpDetailLabel">Suggested heat</div>
            <div class="fpDetailValue">${escapeHtml(heat)}</div>
          </div>
        </div>

        <div class="fpNoteBlock">
          <div class="fpDetailLabel">Notes</div>
          <div class="fpDetailNote">${escapeHtml(f.notes || "No notes listed yet.")}</div>
        </div>

        <div class="fpDetailActions">
          <button type="button" class="btn primary" id="fpUse">Add to Blend</button>
        </div>
      </div>
    `;

    detailPanel = detailShellEl.querySelector("#fpUse");
    detailPanel?.addEventListener("click", () => {
      onUse(f._raw || f);
      close();
    });
  }
  
  function updateSelectedIndicator(card){
  card.classList.add("selected");
}

  function close() {
    overlay.remove();
  }

  document.body.appendChild(overlay);
  render();
}

function formatAbsRange(f) {
  if (f?.absorptionRange?.minPct != null && f?.absorptionRange?.maxPct != null) {
    return `${f.absorptionRange.minPct}–${f.absorptionRange.maxPct}% absorption`;
  }
  if (f?.absorption != null) {
    return `${Math.round(Number(f.absorption) * 100)}% absorption`;
  }
  return "Absorption —";
}

function formatW(f) {
  const min = f?.specs?.w?.min;
  const max = f?.specs?.w?.max;
  if (min != null && max != null) return min === max ? `W ${min}` : `W ${min}–${max}`;
  if (min != null) return `W ${min}`;
  return "W —";
}

function formatPL(f) {
  const min = f?.specs?.pl?.min;
  const max = f?.specs?.pl?.max;
  if (min != null && max != null) return min === max ? `${min}` : `${min}–${max}`;
  if (min != null) return `${min}`;
  return "—";
}

function formatHeat(f) {
  const min = f?.heat?.tempF?.min;
  const max = f?.heat?.tempF?.max;
  if (min != null && max != null) return `${Math.round(min)}–${Math.round(max)}°F`;
  if (min != null) return `${Math.round(min)}°F+`;
  return "—";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}