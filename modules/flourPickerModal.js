import { loadFloursForBrowser } from "./floursDb.js";

const FLOUR_BOOKMARKS_KEY = "pdt_flour_bookmarks_v1";

export async function openFlourPickerModal(store, opts = {}) {
  const onUse = typeof opts.onUse === "function" ? opts.onUse : () => {};
  const initialSelectedIds = Array.isArray(opts.initialSelectedIds)
    ? opts.initialSelectedIds.filter(Boolean)
    : [];
  const flours = await loadFloursForBrowser(window.__PDT_STORE__ || store);

  let activeSort = "name";
  let activeSearch = "";
  let activeType = "all";
  let activeScope = "all";
  const selectedIds = new Set(initialSelectedIds);
  const bookmarkedIds = loadBookmarkedFlourIds();

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
        <div class="seg fpHeadScope" role="tablist" aria-label="Flour scope">
          <button type="button" class="segbtn active" id="fpScopeAll">All</button>
          <button type="button" class="segbtn" id="fpScopeBookmarked">Bookmarked</button>
        </div>
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
  const scopeAllEl = box.querySelector("#fpScopeAll");
  const scopeBookmarkedEl = box.querySelector("#fpScopeBookmarked");

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

  scopeAllEl.addEventListener("click", () => {
    activeScope = "all";
    render();
  });

  scopeBookmarkedEl.addEventListener("click", () => {
    activeScope = "bookmarked";
    render();
  });

  function render() {
    const q = activeSearch.trim().toLowerCase();

    let list = flours.filter((f) => {
      const hay = `${f.brand || ""} ${f.name || ""} ${f.type || ""}`.toLowerCase();
      const scopeOk = activeScope === "bookmarked" ? bookmarkedIds.has(f.id) : true;
      const typeOk =
        activeType === "all"
          ? true
          : String(f.type || "").toLowerCase() === activeType.toLowerCase();
      const searchOk = !q || hay.includes(q);
      return scopeOk && typeOk && searchOk;
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

    syncScopeButtons();
    metaEl.textContent =
      `${list.length} shown | Flours added: ${selectedIds.size} | Bookmarked: ${bookmarkedIds.size}`;

    gridEl.innerHTML = "";

    if (!list.length) {
      gridEl.innerHTML = `<div class="muted">${
        activeScope === "bookmarked"
          ? "No bookmarked flours yet."
          : "No flours found."
      }</div>`;
      return;
    }

    list.forEach((f) => gridEl.appendChild(flourTplCard(f)));
  }

  function syncScopeButtons() {
    scopeAllEl.classList.toggle("active", activeScope === "all");
    scopeBookmarkedEl.classList.toggle("active", activeScope === "bookmarked");
    scopeBookmarkedEl.textContent = `Bookmarked (${bookmarkedIds.size})`;
  }

  function flourTplCard(f) {
    const wrap = document.createElement("div");
    wrap.className = "tplCardWrap flourTplWrap";

    const selected = selectedIds.has(f.id);
    const bookmarked = bookmarkedIds.has(f.id);
    if (selected) wrap.classList.add("is-selected");

    const protein = readProtein(f);
    const abs = formatAbsCompact(f);
    const w = formatWCompact(f);
    const logoSrc = f.brandLogo || f.logo || "./icons/flour.svg";

    wrap.title = [
      protein != null ? `Protein ${protein}%` : "Protein -",
      w,
      abs
    ].join(" | ");

    wrap.innerHTML = `
      <button type="button" class="tplTile flourTplTile">
        <div class="tplTileInner flourTplInner">
          <img src="${escapeAttr(logoSrc)}" alt="${escapeAttr(`${f.brand || "Flour"} logo`)}" loading="lazy" decoding="async" />
        </div>
        <div class="tplTileMark ${selected ? "on" : ""}"></div>
      </button>

      <div class="tplCap flourTplCap">
        <div class="flourCardTop">
          <div>
            <div class="tplName flourTplName">${escapeHtml([f.brand, f.name].filter(Boolean).join(" "))}</div>
            <div class="tplSub flourTplSub">${escapeHtml(f.type || "-")}</div>
            <div class="flourStatusRow">
              ${selected ? `<span class="flourStatus is-added">Added to formula</span>` : ""}
              ${!selected && bookmarked ? `<span class="flourStatus is-bookmarked">Bookmarked</span>` : ""}
            </div>
          </div>

          <div class="flourCardActions">
            <button
              type="button"
              class="flourBookmark ${bookmarked ? "on" : ""}"
              aria-pressed="${bookmarked ? "true" : "false"}"
              aria-label="${bookmarked ? "Remove bookmark" : "Bookmark flour"}"
            >
              ${bookmarked ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              class="flourAdd ${selected ? "is-selected" : ""}"
              aria-label="${selected ? "Remove flour from formula" : "Add flour to formula"}"
            >
              ${selected ? "Added" : "Add"}
            </button>
          </div>
        </div>
      </div>
    `;

    const toggleSelected = () => {
      if (selectedIds.has(f.id)) selectedIds.delete(f.id);
      else selectedIds.add(f.id);
      render();
    };

    const toggleBookmark = () => {
      if (bookmarkedIds.has(f.id)) bookmarkedIds.delete(f.id);
      else bookmarkedIds.add(f.id);
      saveBookmarkedFlourIds(bookmarkedIds);
      render();
    };

    wrap.querySelector(".tplTile").addEventListener("click", toggleSelected);
    wrap.querySelector(".flourAdd").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSelected();
    });
    wrap.querySelector(".flourBookmark").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBookmark();
    });

    return wrap;
  }

  function done() {
    const picked = flours.filter((f) => selectedIds.has(f.id)).map((f) => f._raw || f);
    onUse(picked);
    overlay.remove();
  }

  function close() {
    overlay.remove();
  }

  document.body.appendChild(overlay);
  render();
}

function loadBookmarkedFlourIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(FLOUR_BOOKMARKS_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch (_) {
    return new Set();
  }
}

function saveBookmarkedFlourIds(ids) {
  try {
    localStorage.setItem(FLOUR_BOOKMARKS_KEY, JSON.stringify(Array.from(ids).sort()));
  } catch (_) {}
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
  if (min != null && max != null) return min === max ? `W ${min}` : `W ${min}-${max}`;
  if (min != null) return `W ${min}`;
  return "W -";
}

function formatAbsCompact(f) {
  const min = f?.absorptionRange?.minPct ?? f?.absorption?.minPct ?? null;
  const max = f?.absorptionRange?.maxPct ?? f?.absorption?.maxPct ?? null;
  if (min != null && max != null) return `Abs ${min}-${max}%`;
  if (min != null) return `Abs ${min}%`;
  return "Abs -";
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
