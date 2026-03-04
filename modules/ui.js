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

function doughPanel({
    onPreview,
    onOpenKB
}) {
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

function templatesPanel(store, onPreview) {
    const idx = store.get("indexes", {});
    const list = idx.templates?.items || [];
    const el = div(`
    <div class="item">
      <h4>3b) Templates</h4>
      <p class="muted">Externally loaded. Click one to apply (hook your auto-population here).</p>
      <div class="list" id="tplList"></div>
    </div>
  `);

    const out = el.querySelector("#tplList");
    out.innerHTML = list.map(t => `
    <div class="item" data-id="${esc(t.id)}" style="cursor:pointer;">
      <h4>${esc(t.name)}</h4>
      <p>${esc(t.summary || "")}</p>
    </div>
  `).join("");

    out.querySelectorAll("[data-id]").forEach(card => {
        card.addEventListener("click", () => {
            const id = card.getAttribute("data-id");
            onPreview?.(`<div class="item"><h4>Template Applied</h4><p class="muted">${esc(id)}</p></div>`);
        });
    });

    return el;
}

function databasesPanel(store) {
    const idx = store.get("indexes", {});
    const list = idx.databases?.items || [];
    return div(`
    <div class="item">
      <h4>3c) Databases</h4>
      <p class="muted">This is the index of DB modules. Each can be its own JSON file later.</p>
      <div class="list">
        ${list.map(x => `
          <div class="item">
            <h4>${esc(x.name)}</h4>
            <p>${esc(x.summary || "")}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `);
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