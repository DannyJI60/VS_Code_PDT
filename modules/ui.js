import {
    renderSauceSource
} from "./sauceSource.js";

import {
    getPlaceholderSignals,
    showSnippetPopup
} from "./signals.js";

/* 3a) Foundation plug-ins */
import {
    loadPrefs
} from "./prefs.js";

import {
    mountOvenWidget
} from "./ovenWidget.js";

/* 2a) Toast helper (prevents "toast is not defined") */
const toast = (msg, ms = 1600) => {
  // If you later add a real toast somewhere else, this will use it.
  if (typeof window.toast === "function" && window.toast !== toast) {
    try { return window.toast(msg, ms); } catch (_) {}
  }

  // Minimal built-in toast (no CSS required)
  let el = document.getElementById("pdtToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "pdtToast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(0,0,0,0.75)";
    el.style.color = "#fff";
    el.style.fontSize = "13px";
    el.style.zIndex = "9999";
    el.style.maxWidth = "80vw";
    el.style.textAlign = "center";
    el.style.opacity = "0";
    el.style.transition = "opacity 120ms ease";
    document.body.appendChild(el);
  }

  el.textContent = String(msg ?? "");
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = "0"; }, ms);
};

export function renderRoute({
    route,
    mount,
    store,
    onPreview,
    onOpenKB
}) {
    mount.innerHTML = ""; // wipe

    if (route === "dough") {
        mount.appendChild(doughPanel({
            onPreview,
            onOpenKB
        }));
        onPreview(`<div class="muted">Select a template or enter dough settings.</div>`);
        return;
    }

    if (route === "templates") {
        mount.appendChild(templatesPanel(store, onPreview));
        return;
    }

    if (route === "databases") {
        mount.appendChild(databasesPanel(store));
        return;
    }

    if (route === "fermentation") {
        mount.appendChild(fermentationPanel(store, onPreview));
        return;
    }

    if (route === "preferences") {
        mount.appendChild(preferencesPanel(store));
        return;
    }

    if (route === "glossary") {
        mount.appendChild(glossaryPanel(store, onOpenKB));
        return;
    }

    if (route === "troubleshooting") {
        mount.appendChild(troubleshootingPanel(store, onOpenKB));
        return;
    }

    if (route === "sauceSource") {
        mount.appendChild(renderSauceSource());
        return;
    }

    mount.innerHTML = `<div class="muted">Route not implemented yet.</div>`;
}

/* 3a) Panels (numbered, replaceable blocks) */

/* =========================================================
   F0) STEP 2 • FLOUR (Full-page “template grid”)
   - Lives in route: databases (for now)
   - No real data wiring yet; uses placeholders
   ========================================================= */

function databasesPanel(store) {
  // F1) Root
  const root = div(`
    <div class="flourPage">

      <!-- F2) Header / Controls -->
      <div class="flourTop">
        <div>
          <div class="steptitle">Step 2 • Flour</div>
          <div class="stepsub">Pick flours fast, then blend. (Prototype UI)</div>
        </div>

        <div class="flourControls">
          <!-- F2a) Search -->
          <div class="flourSearch">
            <input class="input" id="flourSearch" placeholder="Search flour… (brand, name, type)" />
          </div>

          <!-- F2b) Sort -->
          <div class="flourSort">
            <label class="muted" style="font-size:12px;">Sort</label>
            <select class="input" id="flourSort">
              <option value="pop">Popularity</option>
              <option value="brand">Brand</option>
              <option value="protein">Protein</option>
              <option value="absorption">Absorption</option>
              <option value="type">Type</option>
            </select>
          </div>

          <!-- F2c) Bookmarked only -->
          <button class="btn ghost" id="btnFlourBookmarkedOnly" type="button" aria-pressed="false">
            ⭐ Bookmarked only
          </button>
        </div>
      </div>

      <!-- F3) Layout: grid + blend panel -->
      <div class="flourLayout">

        <!-- F4) Catalog -->
        <div class="flourCatalog">

          <!-- F4a) Section: Popular for style (placeholder) -->
          <div class="flourSection">
            <div class="flourSectionHead">
              <div class="flourSectionTitle">Popular for this style</div>
              <div class="muted" style="font-size:12px;">(placeholder list)</div>
            </div>
            <div class="flourGrid" id="flourGridPopular"></div>
          </div>

          <!-- F4b) Section: All flours (placeholder) -->
          <div class="flourSection" style="margin-top:14px;">
            <div class="flourSectionHead">
              <div class="flourSectionTitle">All flours</div>
              <div class="muted" style="font-size:12px;">Use search + sort</div>
            </div>
            <div class="flourGrid" id="flourGridAll"></div>
          </div>

          <!-- F4c) Community section (hidden until real data exists) -->
          <div class="flourSection hidden" id="flourCommunitySection" style="margin-top:14px;">
            <div class="flourSectionHead">
              <div class="flourSectionTitle">Popular in the community</div>
              <div class="muted" style="font-size:12px;">(auto-hides until enough data)</div>
            </div>
            <div class="flourGrid" id="flourGridCommunity"></div>
          </div>

        </div>

        <!-- F5) Blend panel -->
        <div class="flourBlend">
          <div class="item">
            <h4>Flour Blend</h4>
            <p class="muted">Click cards to add. Percent + math comes next.</p>

            <!-- F5a) Selected flours list -->
            <div id="blendList" class="blendList"></div>

            <!-- F5b) Add button -->
            <div style="display:flex; gap:10px; margin-top:12px;">
              <button class="btn primary" id="btnAddFlour" type="button">Add Flour</button>
              <button class="btn ghost" id="btnClearBlend" type="button">Clear</button>
            </div>

            <!-- F5c) Calculated labels (placeholder) -->
            <div class="blendStats">
              <div class="stat">
                <div class="k">Protein (blend)</div>
                <div class="v" id="blendProtein">—</div>
              </div>
              <div class="stat">
                <div class="k">Absorption (blend)</div>
                <div class="v" id="blendAbsorb">—</div>
              </div>
            </div>

            <div class="muted" style="font-size:11px; margin-top:10px;">
              Later: traffic-light warnings + KB deep dives.
            </div>
          </div>
        </div>

      </div>
    </div>
  `);

  // F6) Placeholder flour data (UI only; replace with real DB later)
  const FLOURS = [
    { id: "caputo_nuvola", brand: "Caputo", name: "Nuvola", type: "00", protein: 12.5, absorption: 0.66, logo: "./icons/template-neapolitan.svg" },
    { id: "ka_bread", brand: "King Arthur", name: "Bread Flour", type: "Bread", protein: 12.7, absorption: 0.64, logo: "./icons/template-ny.svg" },
    { id: "all_trumps", brand: "General Mills", name: "All Trumps", type: "High Gluten", protein: 14.0, absorption: 0.68, logo: "./icons/template-ny.svg" },
    { id: "semola", brand: "Durum", name: "Semola Rimacinata", type: "Semolina", protein: 13.0, absorption: 0.58, logo: "./icons/template-chicago.svg" },
    { id: "ap_generic", brand: "Generic", name: "All Purpose", type: "AP", protein: 11.5, absorption: 0.62, logo: "./icons/template-detroit.svg" },
  ];

  // F7) State (minimal)
  const state = {
    bookmarkedOnly: false,
    q: "",
    sort: "pop",
    selected: [], // array of flour objects
  };

  // F8) DOM
  const $ = (sel) => root.querySelector(sel);
  const elPopular = $("#flourGridPopular");
  const elAll = $("#flourGridAll");
  const elBlendList = $("#blendList");

  // F9) Render helpers
  function flourCard(f) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "flourCard";
    el.innerHTML = `
      <div class="flourLogo">
        <img src="${f.logo}" alt="" />
      </div>
      <div class="flourMeta">
        <div class="flourName">${esc(f.brand)} • ${esc(f.name)}</div>
        <div class="flourSub muted">${esc(f.type)} • Protein ${f.protein}% • Abs ${Math.round(f.absorption * 100)}%</div>
      </div>
      <div class="flourStar" title="Bookmark (later)">⭐</div>
    `;
    el.addEventListener("click", () => {
      // F9a) Add to blend (placeholder behavior)
      state.selected.push(f);
      renderBlend();
    });
    return el;
  }

  function renderCatalog() {
    const q = (state.q || "").trim().toLowerCase();

    // F10) Simple filter
    let list = FLOURS.filter(f => {
      if (!q) return true;
      const hay = `${f.brand} ${f.name} ${f.type}`.toLowerCase();
      return hay.includes(q);
    });

    // F11) Simple sort (placeholder)
    if (state.sort === "brand") list.sort((a,b) => (a.brand+a.name).localeCompare(b.brand+b.name));
    if (state.sort === "protein") list.sort((a,b) => (b.protein - a.protein));
    if (state.sort === "absorption") list.sort((a,b) => (b.absorption - a.absorption));
    if (state.sort === "type") list.sort((a,b) => (a.type).localeCompare(b.type));

    // F12) Popular row = first 3 for now
    elPopular.innerHTML = "";
    list.slice(0,3).forEach(f => elPopular.appendChild(flourCard(f)));

    // F13) All row
    elAll.innerHTML = "";
    list.forEach(f => elAll.appendChild(flourCard(f)));
  }

  function renderBlend() {
    // F14) Blend list
    elBlendList.innerHTML = "";

    if (!state.selected.length) {
      elBlendList.innerHTML = `<div class="muted">No flour selected yet.</div>`;
      $("#blendProtein").textContent = "—";
      $("#blendAbsorb").textContent = "—";
      return;
    }

    state.selected.forEach((f, idx) => {
      const row = document.createElement("div");
      row.className = "blendRow";
      row.innerHTML = `
        <div class="blendLeft">
          <div class="blendTitle">${esc(f.brand)} • ${esc(f.name)}</div>
          <div class="muted" style="font-size:12px;">${esc(f.type)} • P ${f.protein}% • Abs ${Math.round(f.absorption*100)}%</div>
        </div>
        <button class="btn ghost" type="button" data-rm="${idx}">Remove</button>
      `;
      row.querySelector("[data-rm]").addEventListener("click", () => {
        state.selected.splice(idx, 1);
        renderBlend();
      });
      elBlendList.appendChild(row);
    });

    // F15) Placeholder “blend stats”
    // For now, show simple average; later we’ll weight by % and enforce totals.
    const avgProtein = state.selected.reduce((s,f)=>s+f.protein,0) / state.selected.length;
    const avgAbs = state.selected.reduce((s,f)=>s+f.absorption,0) / state.selected.length;

    $("#blendProtein").textContent = `${avgProtein.toFixed(1)}%`;
    $("#blendAbsorb").textContent = `${Math.round(avgAbs*100)}%`;
  }

  // F16) Wire controls
  $("#flourSearch").addEventListener("input", (e) => {
    state.q = e.target.value || "";
    renderCatalog();
  });

  $("#flourSort").addEventListener("change", (e) => {
    state.sort = e.target.value || "pop";
    renderCatalog();
  });

  $("#btnFlourBookmarkedOnly").addEventListener("click", () => {
    // Placeholder: UI toggle only. Real bookmarks later.
    state.bookmarkedOnly = !state.bookmarkedOnly;
    $("#btnFlourBookmarkedOnly").setAttribute("aria-pressed", String(state.bookmarkedOnly));
    alert("Bookmarks not wired yet. This is the UI placeholder.");
  });

  $("#btnAddFlour").addEventListener("click", () => {
    alert("Add Flour button placeholder. For now, click flour cards.");
  });

  $("#btnClearBlend").addEventListener("click", () => {
    state.selected = [];
    renderBlend();
  });

  // F17) Initial render
  renderCatalog();
  renderBlend();

    return root;
}

function doughPanel({ onPreview, onOpenKB }) {
    // D1) Minimal session state (UI writes here; engine will later read this)
    const session = {
        units: "imperial",
        shape: "round",
        diameterIn: 12,
        rectWIn: 14,
        rectLIn: 14,
        surface: "freeform", // pan | freeform
        calcMethod: "tf", // tf | doughWeight
        tf: 0.100,
        doughWeight: 0, // if calcMethod = doughWeight
        hydration: 0.62,
        balls: 1,
        preferment: "direct" // direct | biga | poolish | sourdough
    };




    const root = div(`
  
    <div>
      <!-- D2) Step 1 container -->
      <div class="step">
        <div class="stephead">
          <div>
            <div class="steptitle">Step 1 • Foundation</div>
            <div class="stepsub">Geometry → TF → Dough weight. Preferment lives here.</div>
          </div>
          <div class="muted" style="font-size:12px;">Signals are placeholders</div>
        </div>

        <div class="stepbody">
		    <!-- 3b) Oven context mount (optional, modular) -->
        <div id="ovenMount"></div>
          <div class="foundation-grid">

            <!-- D3) Left column -->
            <div style="display:flex; flex-direction:column; gap:12px;">

              <!-- D3a Units -->
              <div class="field" data-field="units">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Units</span>
                    <span class="kbmini" data-kb="units" title="KB">?</span>
                  </div>
                </div>
                <div class="pills">
                  <div class="pill active" data-units="imperial">Imperial</div>
                  <div class="pill" data-units="metric">Metric</div>
                </div>
              </div>

              <!-- D3b Shape -->
              <div class="field" data-field="shape">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Shape</span>
                    <span class="kbmini" data-kb="shape" title="KB">?</span>
                  </div>
                </div>
                <div class="square-grid">
                  <div class="sq active" data-shape="round">
                    <div class="sqico">◯</div>
                    <div>
                      <div class="sqt">Round</div>
                      <div class="sqs">Diameter</div>
                    </div>
                  </div>
                  <div class="sq" data-shape="rect">
                    <div class="sqico">▭</div>
                    <div>
                      <div class="sqt">Rectangular</div>
                      <div class="sqs">Width × Length</div>
                    </div>
                  </div>
                </div>

                <div class="inline" style="margin-top:10px;">
                  <div id="roundDims">
                    <label class="lbl" style="margin:0;">Diameter (in)</label>
                    <input class="input smallinput" id="diamIn" type="number" step="0.25" value="12" />
                  </div>
                  <div id="rectDims" class="hidden">
                    <label class="lbl" style="margin:0;">W × L (in)</label>
                    <div class="inline">
                      <input class="input smallinput" id="rectWIn" type="number" step="0.25" value="14" />
                      <input class="input smallinput" id="rectLIn" type="number" step="0.25" value="14" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- D3c Surface -->
              <div class="field" data-field="surface">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Baking Surface</span>
                    <span class="kbmini" data-kb="surface" title="KB">?</span>
                  </div>
                </div>
                <div class="pills">
                  <div class="pill" data-surface="pan">Pan</div>
                  <div class="pill active" data-surface="freeform">Freeform</div>
                </div>
              </div>

            </div>

            <!-- D4) Right column -->
            <div style="display:flex; flex-direction:column; gap:12px;">

              <!-- D4a Calc method + TF -->
              <div class="field" data-field="tf">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Calculation</span>
                    <span class="sig gray" data-sig="tf" title="Signal"></span>
                    <span class="kbmini" data-kb="tf" title="KB">?</span>
                  </div>
                </div>

                <div class="pills">
                  <div class="pill active" data-calc="tf">Thickness Factor</div>
                  <div class="pill" data-calc="doughWeight">Dough Weight</div>
                </div>

                <div id="tfBlock" style="margin-top:10px;">
                  <div class="inline" style="justify-content:space-between;">
                    <div>
                      <div class="muted" style="font-size:12px;">TF</div>
                      <div style="font-weight:900; font-size:20px;" id="tfRead">0.100</div>
                    </div>

                    <div style="min-width:200px; width:100%;">
                      <input id="tfSlider" type="range" min="0.050" max="0.140" step="0.001" value="0.100" style="width:100%;" />
                      <div class="muted" style="font-size:11px; margin-top:6px;">
                        Color-coded range (placeholder). Style ranges later.
                      </div>
                    </div>

                    <div style="width:120px;">
                      <label class="lbl" style="margin:0;">TF input</label>
                      <input class="input" id="tfInput" type="number" step="0.001" value="0.100" />
                    </div>
                  </div>
                </div>

                <div id="dwBlock" class="hidden" style="margin-top:10px;">
                  <label class="lbl">Target dough weight</label>
                  <input class="input" id="dwInput" type="number" step="1" placeholder="grams / ounces (later)" />
                </div>
              </div>

              <!-- D4b Hydration -->
              <div class="field" data-field="hydration">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Hydration</span>
                    <span class="sig a" data-sig="hydration" title="Signal"></span>
                    <span class="kbmini" data-kb="hydration" title="KB">?</span>
                  </div>
                  <div class="muted" style="font-size:12px;" id="hydRead">62%</div>
                </div>

                <input id="hydSlider" type="range" min="0.50" max="0.85" step="0.01" value="0.62" style="width:100%;" />
                <div class="inline" style="margin-top:10px;">
                  <div style="width:160px;">
                    <label class="lbl" style="margin:0;">Hydration</label>
                    <input class="input" id="hydInput" type="number" step="0.01" min="0.50" max="0.85" value="0.62" />
                  </div>
                  <div style="width:160px;">
                    <label class="lbl" style="margin:0;">Balls</label>
                    <input class="input" id="ballsInput" type="number" step="1" min="1" value="1" />
                  </div>
                </div>
              </div>

              <!-- D4c Preferment -->
              <div class="field" data-field="preferment">
                <div class="fieldtop">
                  <div class="fieldlbl">
                    <span>Preferment</span>
                    <span class="sig gray" data-sig="preferment" title="Signal"></span>
                    <span class="kbmini" data-kb="preferment" title="KB">?</span>
                  </div>
                </div>

                <div class="square-grid">
                  <div class="sq active" data-pref="direct">
                    <div class="sqico">⚡</div>
                    <div>
                      <div class="sqt">Direct</div>
                      <div class="sqs">No preferment</div>
                    </div>
                  </div>
                  <div class="sq" data-pref="biga">
                    <div class="sqico">🇮🇹</div>
                    <div>
                      <div class="sqt">Biga</div>
                      <div class="sqs">Stiff</div>
                    </div>
                  </div>
                  <div class="sq" data-pref="poolish">
                    <div class="sqico">🧪</div>
                    <div>
                      <div class="sqt">Poolish</div>
                      <div class="sqs">100% hydration</div>
                    </div>
                  </div>
                  <div class="sq" data-pref="sourdough">
                    <div class="sqico">🌾</div>
                    <div>
                      <div class="sqt">Sourdough</div>
                      <div class="sqs">Starter</div>
                    </div>
                  </div>
                </div>

                <div class="muted" style="font-size:11px; margin-top:10px;">
                  Preferment parameters will appear here later (placeholder).
                </div>
              </div>

            </div>

          </div>

          <!-- D5) Foundation actions -->
          <div style="display:flex; gap:10px; margin-top:12px; justify-content:flex-end;">
            <button class="btn ghost" id="btnFoundationKB">Open KB</button>
            <button class="btn primary" id="btnFoundationPreview">Update Preview</button>
          </div>

        </div>
      </div>

      <!-- D6) Steps 2+ placeholders -->
      <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
        <div class="item">
          <h4>Step 2 • Fermentation (next)</h4>
          <p class="muted">Fermentation model lives in Preferences. Recipe-level timing inputs will go here later.</p>
        </div>
        <div class="item">
          <h4>Step 3 • Flour Composition (next)</h4>
          <p class="muted">Flour blends and strength data will live here later.</p>
        </div>
      </div>

    </div>
  `);

    /* 3c) Oven widget mount (optional, removable) */
    const prefs = loadPrefs();
    const ovenMount = root.querySelector("#ovenMount");

    mountOvenWidget({
        mountEl: ovenMount,
        prefs,
        session,
        onSessionChange: () => {
            // Soft constraints may have changed diameter, etc.
            // Refresh preview (still placeholder until engine is wired)
            refresh()
        },
        onOpenPrefs: () => {
            // Placeholder: later you’ll route to Preferences UI
            alert("Preferences UI placeholder. Oven list lives in prefs for now.");
        }
    });

    // D7) Signals (placeholders)
    const signals = getPlaceholderSignals(session);
    applySignals(root, signals);
	
	/* =========================================================
   22) Foundation refresh helper
   ========================================================= */
function refresh(){
  onPreview?.(renderPreviewPlaceholder(session));
}

    // D8) KB mini popups (placeholders)
    root.querySelectorAll("[data-kb]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const key = btn.getAttribute("data-kb");
            const sig = signals[key] || {
                title: "KB (placeholder)",
                snippet: "Placeholder snippet. This will be connected to KB entries later.",
                kbQuery: key
            };

            showSnippetPopup({
                anchorEl: btn,
                title: sig.title || "KB",
                snippet: sig.snippet || "",
                onDeepDive: () => {
                    // Deep-dive: open KB drawer and prefill search (placeholder)
                    onOpenKB?.();
                    // If KB module later exposes a setter, you can wire it then.
                    // For now: just open KB drawer.
                }
            });
        });
    });

    // D9) Units pills
    root.querySelectorAll("[data-units]").forEach(p => {
        p.addEventListener("click", () => {
            root.querySelectorAll("[data-units]").forEach(x => x.classList.remove("active"));
            p.classList.add("active");
            session.units = p.getAttribute("data-units");
			refresh()
        });
    });

    // D10) Shape toggles + dims switch
    const roundDims = root.querySelector("#roundDims");
    const rectDims = root.querySelector("#rectDims");

    root.querySelectorAll("[data-shape]").forEach(card => {
        card.addEventListener("click", () => {
            root.querySelectorAll("[data-shape]").forEach(x => x.classList.remove("active"));
            card.classList.add("active");
            session.shape = card.getAttribute("data-shape");
            const isRound = session.shape === "round";
            roundDims.classList.toggle("hidden", !isRound);
            rectDims.classList.toggle("hidden", isRound);
			refresh()
        });
    });

    // D11) Surface pills
    root.querySelectorAll("[data-surface]").forEach(p => {
        p.addEventListener("click", () => {
            root.querySelectorAll("[data-surface]").forEach(x => x.classList.remove("active"));
            p.classList.add("active");
            session.surface = p.getAttribute("data-surface");
			refresh()
        });
    });

    // D12) Calc method + TF block swap
    const tfBlock = root.querySelector("#tfBlock");
    const dwBlock = root.querySelector("#dwBlock");
    root.querySelectorAll("[data-calc]").forEach(p => {
        p.addEventListener("click", () => {
            root.querySelectorAll("[data-calc]").forEach(x => x.classList.remove("active"));
            p.classList.add("active");
            session.calcMethod = p.getAttribute("data-calc");
            tfBlock.classList.toggle("hidden", session.calcMethod !== "tf");
            dwBlock.classList.toggle("hidden", session.calcMethod !== "doughWeight");
			refresh()
        });
    });

    // D13) TF slider + input sync
    const tfSlider = root.querySelector("#tfSlider");
    const tfInput = root.querySelector("#tfInput");
    const tfRead = root.querySelector("#tfRead");

    function setTF(v) {
        const n = clamp(v, 0.050, 0.140);
        session.tf = n;
        tfSlider.value = n.toFixed(3);
        tfInput.value = n.toFixed(3);
        tfRead.textContent = n.toFixed(3);
		refresh()
    }

    tfSlider.addEventListener("input", () => setTF(parseFloat(tfSlider.value)));
    tfInput.addEventListener("input", () => setTF(parseFloat(tfInput.value)));

    // D14) Hydration slider + input sync
    const hydSlider = root.querySelector("#hydSlider");
    const hydInput = root.querySelector("#hydInput");
    const hydRead = root.querySelector("#hydRead");

    function setHyd(v) {
        const n = clamp(v, 0.50, 0.85);
        session.hydration = n;
        hydSlider.value = n.toFixed(2);
        hydInput.value = n.toFixed(2);
        hydRead.textContent = `${Math.round(n * 100)}%`;
		refresh()
    }

    hydSlider.addEventListener("input", () => setHyd(parseFloat(hydSlider.value)));
    hydInput.addEventListener("input", () => setHyd(parseFloat(hydInput.value)));

    // D15) Balls
    root.querySelector("#ballsInput").addEventListener("input", (e) => {
        session.balls = Math.max(1, parseInt(e.target.value || "1", 10));
		refresh()
    });

    // D16) Preferment selection
    root.querySelectorAll("[data-pref]").forEach(card => {
        card.addEventListener("click", () => {
            root.querySelectorAll("[data-pref]").forEach(x => x.classList.remove("active"));
            card.classList.add("active");
            session.preferment = card.getAttribute("data-pref");
			refresh()
        });
    });

    // D17) Actions
    root.querySelector("#btnFoundationKB").addEventListener("click", () => onOpenKB?.());

    root.querySelector("#btnFoundationPreview").addEventListener("click", () => {
        // Placeholder preview (until engine is wired)
        onPreview?.(renderPreviewPlaceholder(session));
    });

    // Initial preview
    onPreview?.(renderPreviewPlaceholder(session));

    return root;
  }

// helpers for doughPanel
/* =========================================================
   21) Live Preview (Foundation metrics now real)
   ========================================================= */

function renderPreviewPlaceholder(session){
  const m = computeFoundationMetrics(session);

  const size = (session.shape === "round")
    ? `${session.diameterIn}" round`
    : `${session.rectWIn}"×${session.rectLIn}" rect`;

  const completeness = m.complete ? "Complete" : "Incomplete";

  return `
    <div class="item">
      <h4>Recipe Snapshot (Foundation)</h4>
      <p class="muted">
        This is now computing real geometry + dough weight.
        Ingredients and fermentation come later.
      </p>

      <div class="item">
        <h4>Foundation</h4>
        <p class="muted">
          Units: ${esc(session.units)} • Shape: ${esc(session.shape)} (${esc(size)}) • Surface: ${esc(session.surface)} • Preferment: ${esc(session.preferment)}
        </p>
        <p class="muted">
          Calc: ${esc(session.calcMethod)} • TF: ${fmt(session.tf,3)} • Hydration: ${Math.round(session.hydration*100)}% • Balls: ${session.balls}
        </p>
      </div>

      <div class="item">
        <h4>Computed</h4>
        <p class="muted">
          Area: ${fmt(m.areaIn2,1)} in²
        </p>
        <p class="muted">
          Dough weight: ${fmt(m.totalDoughG,0)} g total • ${fmt(m.perBallG,0)} g / ball
        </p>
        <p class="muted">
          Status: <strong>${completeness}</strong>
        </p>
      </div>

      <div class="item">
        <h4>Signals (placeholder)</h4>
        <p class="muted">Traffic dots + KB snippet popups are UI scaffolding until rule logic is finalized.</p>
      </div>
    </div>
  `;
}

function applySignals(root, signals) {
    root.querySelectorAll("[data-sig]").forEach(el => {
        const key = el.getAttribute("data-sig");
        const s = signals[key];
        if (!s) return;
        el.classList.remove("g", "a", "r", "gray");
        el.classList.add(s.severity || "gray");
        el.title = s.title || "Signal";
    });
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

/* =========================================================
   T0) TEMPLATES PANEL (Comfy-style full page)
   - Uses /assets/templates/*.svg
   - Two-button switch: Styles | Tribute
   - Left categories + Search + Sort
   - Click card: selects template (wiring can be expanded)
   ========================================================= */

function templatesPanel(store) {
  // T1) Minimal template catalog (Styles V1)
  // NOTE: paths match your folder: assets/templates/*.svg
  const STYLE_TEMPLATES = [
    { id: "ny_round",      name: "NY Round",       cat: "ny",        img: "./assets/templates/ny_round.svg",      desc: "Large foldable slice" },
    { id: "neapolitan",    name: "Neapolitan",     cat: "neo",       img: "./assets/templates/neapolitan.svg",    desc: "Soft center, airy rim" },
    { id: "detroit",       name: "Detroit",        cat: "pan",       img: "./assets/templates/detroit.svg",       desc: "Square pan, caramelized edge" },
    { id: "sicilian",      name: "Sicilian",       cat: "pan",       img: "./assets/templates/sicilian.svg",      desc: "Thick square pan" },
    { id: "bar_pie",       name: "Bar Pie",        cat: "thin",      img: "./assets/templates/bar_pie.svg",       desc: "Thin tavern-style" },
    { id: "tomato_pie",    name: "Tomato Pie",     cat: "regional",  img: "./assets/templates/tomato_pie.svg",    desc: "Sauce-forward square" },
    { id: "deep_dish",     name: "Deep Dish",      cat: "chicago",   img: "./assets/templates/deep_dish.svg",     desc: "Thick, layered pie" },
    { id: "teglia_romana", name: "Teglia Romana",  cat: "roman",     img: "./assets/templates/teglia_romana.svg", desc: "Crispy bottom, airy crumb" },
  ];

  // T2) Tribute (empty for now; architecture in place)
  const TRIBUTE_TEMPLATES = [
    // Example later:
    // { id:"joes", name:"Joe’s NY Slice", cat:"ny", img:"./assets/tributes/joes.svg", desc:"Community tribute" }
  ];

  // T3) Categories (left rail)
  const CATS = [
    { id: "all",      label: "All" },
    { id: "ny",       label: "NY Style" },
    { id: "neo",      label: "Neapolitan" },
    { id: "pan",      label: "Pan Pizza" },
    { id: "thin",     label: "Thin / Tavern" },
    { id: "roman",    label: "Roman" },
    { id: "chicago",  label: "Chicago" },
    { id: "regional", label: "Regional" },
  ];

  // T4) State
  const state = {
    mode: "styles",      // "styles" | "tribute"
    cat: "all",
    q: "",
    sort: "name",        // "name" | "cat"
    selectedId: null,
  };

  // T5) UI
  const root = div(`
    <div class="flourPage templatePage">
      <div class="flourTop">
        <div>
          <div class="steptitle">Templates</div>
          <div class="stepsub">Pick a style preset. Advanced users can change everything.</div>
        </div>

        <div class="flourControls">
          <!-- T5a) Styles | Tribute switch -->
          <div class="seg" role="tablist" aria-label="Template mode">
            <button class="btn ghost segbtn" id="btnModeStyles" type="button" aria-selected="true">Styles</button>
            <button class="btn ghost segbtn" id="btnModeTribute" type="button" aria-selected="false">Tribute</button>
          </div>

          <!-- T5b) Search -->
          <div class="flourSearch">
            <input class="input" id="tplSearch" placeholder="Search templates…" />
          </div>

          <!-- T5c) Sort -->
          <div class="flourSort">
            <select class="input" id="tplSort" title="Sort">
              <option value="name">Sort: Name</option>
              <option value="cat">Sort: Category</option>
            </select>
          </div>
        </div>
      </div>

      <!-- T6) Layout: left categories + grid -->
      <div class="tplLayout">
        <div class="tplRail">
          <div class="tplRailHead muted">Categories</div>
          <div class="tplCats" id="tplCats"></div>

          <!-- T6a) Disclaimer (shown only in Tribute mode) -->
          <div class="tplDisclaimer hidden" id="tplDisclaimer">
            <div class="muted" style="font-size:12px; line-height:1.35;">
              Tribute recipes are community interpretations, not official formulas, and not affiliated with restaurants referenced.
            </div>
          </div>
        </div>

        <div class="tplMain">
          <div class="flourGrid" id="tplGrid"></div>
          <div class="muted" style="font-size:12px; margin-top:10px;" id="tplEmpty"></div>
        </div>
      </div>
    </div>
  `);

  const $ = (sel) => root.querySelector(sel);

  // T7) Render categories
  function renderCats() {
    const wrap = $("#tplCats");
    wrap.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn ghost tplCat";
      b.textContent = c.label;
      b.dataset.cat = c.id;
      if (state.cat === c.id) b.classList.add("active");
      b.addEventListener("click", () => {
        state.cat = c.id;
        renderCats();
        renderGrid();
      });
      wrap.appendChild(b);
    });
  }

  // T8) Data source
  function currentList() {
    return state.mode === "tribute" ? TRIBUTE_TEMPLATES : STYLE_TEMPLATES;
  }

  // T9) Card (Comfy style: image tile + caption below)
  function cardTpl(t) {
    const wrap = document.createElement("div");
    wrap.className = "tplCardWrap";

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tplTile";
    tile.dataset.id = t.id;
    tile.innerHTML = `
      <div class="tplTileInner">
        <img src="${t.img}" alt="" />
      </div>
      <div class="tplTileMark ${state.selectedId === t.id ? "on" : ""}"></div>
    `;

    // simple hover tooltip using title (V1)
    tile.title = `${t.name} — ${t.desc || ""}`.trim();

    tile.addEventListener("click", () => {
      state.selectedId = t.id;
      renderGrid();

      // T9a) V1 behavior: show selection + (optional) push into session if store supports it
      try {
        const session = store?.get ? (store.get("session") || {}) : {};
        // store a minimal template selection; you’ll wire real defaults later
        const next = { ...session, templateId: t.id, templateName: t.name };
        if (store?.set) store.set("session", next);
      } catch (_) {}

      // Visible confirmation without being bossy
      toast(`${t.name} selected`);
    });

    const cap = document.createElement("div");
    cap.className = "tplCap";
    cap.innerHTML = `
      <div class="tplName">${esc(t.name)}</div>
      <div class="tplSub muted">${esc(t.desc || "")}</div>
    `;

    wrap.appendChild(tile);
    wrap.appendChild(cap);
    return wrap;
  }

  // T10) Render grid
  function renderGrid() {
    const list = currentList().slice();

    // Tribute disclaimer visibility
    $("#tplDisclaimer").classList.toggle("hidden", state.mode !== "tribute");

    const q = (state.q || "").trim().toLowerCase();

    let out = list.filter(t => {
      if (state.cat !== "all" && t.cat !== state.cat) return false;
      if (!q) return true;
      return `${t.name} ${t.desc || ""}`.toLowerCase().includes(q);
    });

    if (state.sort === "name") out.sort((a,b) => a.name.localeCompare(b.name));
    if (state.sort === "cat") out.sort((a,b) => (a.cat||"").localeCompare(b.cat||"") || a.name.localeCompare(b.name));

    const grid = $("#tplGrid");
    grid.innerHTML = "";
    out.forEach(t => grid.appendChild(cardTpl(t)));

    const empty = $("#tplEmpty");
    if (!out.length) {
      empty.textContent = state.mode === "tribute"
        ? "No tribute templates yet. (Architecture is ready.)"
        : "No templates match your search.";
    } else {
      empty.textContent = "";
    }
  }

  // T11) Controls
  $("#tplSearch").addEventListener("input", (e) => {
    state.q = e.target.value || "";
    renderGrid();
  });

  $("#tplSort").addEventListener("change", (e) => {
    state.sort = e.target.value || "name";
    renderGrid();
  });

  $("#btnModeStyles").addEventListener("click", () => {
    state.mode = "styles";
    $("#btnModeStyles").setAttribute("aria-selected", "true");
    $("#btnModeTribute").setAttribute("aria-selected", "false");
    renderGrid();
  });

  $("#btnModeTribute").addEventListener("click", () => {
    state.mode = "tribute";
    $("#btnModeStyles").setAttribute("aria-selected", "false");
    $("#btnModeTribute").setAttribute("aria-selected", "true");
    renderGrid();
  });

  // T12) Boot
  renderCats();
  renderGrid();
  return root;
}

function fermentationPanel(store, onPreview) {
    const idx = store.get("indexes", {});
    const models = idx.fermentationModels?.items || [];
    const el = div(`
    <div class="item">
      <h4>3d) Fermentation Models</h4>
      <p class="muted">Choose a model (later: user preference default; used by Auto Yeast).</p>
      <select class="input" id="modelSel"></select>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button class="btn primary" id="btnModelPreview">Preview Model</button>
      </div>
    </div>
  `);

    const sel = el.querySelector("#modelSel");
    sel.innerHTML = models.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");

    el.querySelector("#btnModelPreview").addEventListener("click", () => {
        onPreview?.(`<div class="item"><h4>Fermentation Model</h4><p class="muted">${esc(sel.value)}</p></div>`);
    });

    return el;
}

function preferencesPanel(store) {
    const uiMode = store.get("uiMode", "standard");
    return div(`
    <div class="item">
      <h4>3e) Preferences</h4>
      <p class="muted">This will hold: default model selection, units default, UI mode, template defaults, etc.</p>
      <div class="item">
        <h4>UI Mode</h4>
        <p class="muted">Current: ${esc(uiMode)}</p>
      </div>
    </div>
  `);
}

function glossaryPanel(store, onOpenKB) {
    const idx = store.get("indexes", {});
    const items = idx.glossary?.items || [];
    const el = div(`
    <div class="item">
      <h4>3f) Glossary</h4>
      <p class="muted">Searchable in KB drawer. Click below to open KB.</p>
      <button class="btn primary" id="btnOpen">Open KB Search</button>
      <div class="list" style="margin-top:10px;">
        ${items.slice(0,8).map(x => `
          <div class="item">
            <h4>${esc(x.term)}</h4>
            <p>${esc(x.definition || "")}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `);
    el.querySelector("#btnOpen").addEventListener("click", () => onOpenKB?.());
    return el;
}

function troubleshootingPanel(store, onOpenKB) {
    const idx = store.get("indexes", {});
    const items = idx.troubleshooting?.items || [];
    const el = div(`
    <div class="item">
      <h4>3g) Troubleshooting</h4>
      <p class="muted">Also searchable in KB drawer.</p>
      <button class="btn primary" id="btnOpen">Open KB Search</button>
      <div class="list" style="margin-top:10px;">
        ${items.slice(0,8).map(x => `
          <div class="item">
            <h4>${esc(x.title)}</h4>
            <p>${esc(x.summary || "")}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `);
    el.querySelector("#btnOpen").addEventListener("click", () => onOpenKB?.());
    return el;
}

/* helpers */

/* =========================================================
   20) Foundation Math (real, UI-safe)
   - Internal: inches + grams
   - This is NOT the full ingredient engine yet
   ========================================================= */

function computeAreaIn2(session){
  if (session.shape === "round") {
    const d = Number(session.diameterIn || 0);
    if (!d || d <= 0) return 0;
    const r = d / 2;
    return Math.PI * r * r;
  }
  // rect
  const w = Number(session.rectWIn || 0);
  const l = Number(session.rectLIn || 0);
  if (!w || !l || w <= 0 || l <= 0) return 0;
  return w * l;
}

/* 20b) Dough weight from TF (oz/in²) → grams
   - TF is traditionally oz per in².
   - ounces = area(in²) * TF
   - grams = ounces * 28.349523125
*/
function computeDoughWeightFromTF_g(areaIn2, tf){
  const TF = Number(tf || 0);
  if (!areaIn2 || areaIn2 <= 0 || !TF || TF <= 0) return 0;
  const oz = areaIn2 * TF;
  const g = oz * 28.349523125;
  return g;
}

/* 20c) Completion gate (placeholder for QR/step gating later) */
function isFoundationComplete(session){
  const area = computeAreaIn2(session);
  if (area <= 0) return false;

  if (session.calcMethod === "tf") {
    if (!(Number(session.tf) > 0)) return false;
  } else {
    if (!(Number(session.doughWeight) > 0)) return false;
  }

  if (!(Number(session.hydration) > 0)) return false;
  if (!(Number(session.balls) >= 1)) return false;

  return true;
}

/* 20d) Compute metrics bundle */
function computeFoundationMetrics(session){
  const areaIn2 = computeAreaIn2(session);

  const totalDoughG = (session.calcMethod === "tf")
    ? computeDoughWeightFromTF_g(areaIn2, session.tf)
    : Number(session.doughWeight || 0);

  const balls = Math.max(1, Number(session.balls || 1));
  const perBallG = totalDoughG > 0 ? (totalDoughG / balls) : 0;

  return {
    areaIn2,
    totalDoughG,
    perBallG,
    complete: isFoundationComplete(session)
  };
}

function fmt(n, digits=0){
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return x.toFixed(digits);
}

function div(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
}

function esc(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    } [m]));
}