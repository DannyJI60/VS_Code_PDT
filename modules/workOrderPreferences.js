import { openFlourPickerModal } from "./flourPickerModal.js";
import { loadFloursForBrowser } from "./floursDb.js";
import { showModal } from "./modal.js";
import {
  BUILTIN_OVENS,
  STARTUP_WORKFLOWS,
  getAllIngredients,
  getAllOvens,
  getFavoriteFlourIds,
  loadPrefs,
  normalizePrefs,
  savePrefs
} from "./prefs.js";
import { TEMPLATE_LIBRARY } from "./workOrderRecipe.js";

const TEMPLATE_LOADING_MESSAGE = "Template loading will be enabled in a future update.";
const INGREDIENT_CATEGORY_ORDER = ["Sweeteners", "Dairy", "Strengtheners", "Enrichment", "Custom"];

export function renderWorkOrderPreferences({ store }) {
  let prefs = loadPrefs();
  let flourById = new Map();

  const root = wrap(`
    <div class="prefStack wo-pref-stack">
      <div class="item">
        <h4>Preferences</h4>
        <p class="muted">Saved locally to <code>localStorage["pdt.preferences"]</code>. This page is dedicated to defaults, startup behavior, and your personal ingredient libraries.</p>
      </div>

      <div class="prefsGrid wo-prefs-grid">
        <section class="prefSection wo-pref-section">
          <h4>Calculator Defaults</h4>
          <p>Set the measurement and calculation defaults the calculator should use for new sessions.</p>
          <div class="wo-grid2" style="margin-top:12px;">
            <div>
              <label class="lbl" for="prefWeightUnit">Weight Units</label>
              <select class="input" id="prefWeightUnit">
                <option value="grams">grams</option>
                <option value="ounces">ounces</option>
              </select>
            </div>
            <div>
              <label class="lbl" for="prefSizeUnit">Size Units</label>
              <select class="input" id="prefSizeUnit">
                <option value="inches">inches</option>
                <option value="centimeters">centimeters</option>
              </select>
            </div>
          </div>
          <div style="margin-top:14px;">
            <label class="lbl">Calculation System</label>
            <div class="wo-radio-row" id="prefCalcMethod">
              <label class="wo-radio-card"><input type="radio" name="prefCalcSystem" value="TF" /><span>Thickness Factor (TF)</span></label>
              <label class="wo-radio-card"><input type="radio" name="prefCalcSystem" value="DBW" /><span>Dough Ball Weight (DBW)</span></label>
            </div>
          </div>
          <div class="wo-grid2" style="margin-top:14px;">
            <div>
              <label class="lbl" for="prefBallWeight">Default Dough Ball Weight</label>
              <input class="input" id="prefBallWeight" type="number" min="50" max="2000" step="1" />
            </div>
            <div>
              <label class="lbl" for="prefThicknessFactor">Default Thickness Factor</label>
              <input class="input" id="prefThicknessFactor" type="number" min="0.05" max="0.2" step="0.001" />
            </div>
          </div>
        </section>

        <section class="prefSection wo-pref-section">
          <h4>Startup Behavior</h4>
          <p>Choose what the app should load when you start a fresh calculator session.</p>
          <div style="margin-top:12px;">
            <label class="lbl" for="prefStartupWorkflow">Startup Workflow</label>
            <select class="input" id="prefStartupWorkflow"></select>
          </div>
          <p class="muted wo-pref-status" id="prefStartupStatus" style="margin-top:12px;"></p>
        </section>

        <section class="prefSection wo-pref-section">
          <h4>Oven Preferences</h4>
          <p>Only checked ovens appear in the calculator. Start with none selected, then keep your working oven list tight.</p>
          <div class="wo-selection-list" id="prefOvenList" style="margin-top:12px;"></div>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn primary" id="prefSelectOvens" type="button">Select Ovens</button>
          </div>
        </section>

        <section class="prefSection wo-pref-section">
          <h4>Flour Preferences</h4>
          <p>Manage favorite flours only. The calculator can pull from this list without storing a default blend.</p>
          <div class="wo-selection-list" id="prefFlourList" style="margin-top:12px;"></div>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn primary" id="prefOpenFlourBrowser" type="button">Open Flour Browser</button>
          </div>
        </section>

        <section class="prefSection wo-pref-section">
          <h4>Optional Ingredients</h4>
          <p>Select which optional ingredients should be available in the calculator, and manage custom ingredient presets in one place.</p>
          <div class="wo-selection-list" id="prefIngredientList" style="margin-top:12px;"></div>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn primary" id="prefSelectIngredients" type="button">Select Optional Ingredients</button>
          </div>
        </section>

        <section class="prefSection wo-pref-section">
          <h4>Data Tools</h4>
          <p>Export or reset the locally stored preferences data for this browser profile.</p>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn" id="prefExport" type="button">Export Preferences</button>
            <button class="btn ghost" id="prefReset" type="button">Reset Preferences</button>
          </div>
        </section>
      </div>
    </div>
  `);

  const ui = map(root, {
    weightUnit: "#prefWeightUnit",
    sizeUnit: "#prefSizeUnit",
    calcMethod: "#prefCalcMethod",
    ballWeight: "#prefBallWeight",
    thicknessFactor: "#prefThicknessFactor",
    startupWorkflow: "#prefStartupWorkflow",
    startupStatus: "#prefStartupStatus",
    ovenList: "#prefOvenList",
    selectOvens: "#prefSelectOvens",
    flourList: "#prefFlourList",
    openFlourBrowser: "#prefOpenFlourBrowser",
    ingredientList: "#prefIngredientList",
    selectIngredients: "#prefSelectIngredients",
    exportBtn: "#prefExport",
    resetBtn: "#prefReset"
  });

  function commit(nextPrefs) {
    prefs = normalizePrefs(nextPrefs);
    savePrefs(prefs);
    store.set("prefs", prefs);
    render();
  }

  function render() {
    ui.weightUnit.value = prefs.general.weightUnit;
    ui.sizeUnit.value = prefs.general.sizeUnit;
    ui.ballWeight.value = String(prefs.general.defaultDoughBallWeight);
    ui.thicknessFactor.value = String(prefs.general.defaultThicknessFactor);
    ui.startupWorkflow.innerHTML = STARTUP_WORKFLOWS
      .map((option) => `<option value="${esc(option.id)}">${esc(option.label)}</option>`)
      .join("");
    ui.startupWorkflow.value = prefs.general.startupWorkflow || "blank";

    ui.calcMethod.querySelectorAll("input[name='prefCalcSystem']").forEach((input) => {
      input.checked = input.value === prefs.general.calculationMethod;
    });

    renderStartupStatus();
    renderOvens();
    renderFlours();
    renderIngredients();
  }

  function renderStartupStatus() {
    const workflowId = prefs.general.startupWorkflow || "blank";
    if (workflowId === "blank") {
      ui.startupStatus.textContent = "The calculator will open to a blank workflow.";
      return;
    }

    const template = TEMPLATE_LIBRARY.find((item) => item.id === workflowId);
    ui.startupStatus.textContent = template
      ? `${template.name} will load when you start a fresh calculator session.`
      : TEMPLATE_LOADING_MESSAGE;
  }

  function renderOvens() {
    const selected = getAllOvens(prefs).filter((oven) => oven.selected);
    ui.ovenList.innerHTML = selected.length
      ? selected.map((oven) => `
          <div class="wo-selection-row">
            <div>
              <div class="wo-selection-title">${esc(oven.name)}</div>
              <div class="muted">${esc(`${oven.type} | ${formatTempBand(oven)}`)}</div>
            </div>
            <span class="wo-selection-tag">${oven.builtin ? "Popular" : "Custom"}</span>
          </div>
        `).join("")
      : `<div class="muted">No ovens selected. The calculator will start with no oven selected.</div>`;
  }

  function renderFlours() {
    const favoriteIds = getFavoriteFlourIds(prefs);
    ui.flourList.innerHTML = favoriteIds.length
      ? favoriteIds.map((id) => {
          const flour = flourById.get(id);
          return `
            <div class="wo-selection-row">
              <div>
                <div class="wo-selection-title">&#9733; ${esc(flourName(flour, id))}</div>
                <div class="muted">${esc(flour?.type || "Favorite flour")}</div>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="muted">No favorite flours selected yet.</div>`;
  }

  function renderIngredients() {
    const selected = getAllIngredients(prefs).filter((ingredient) => ingredient.selected);
    ui.ingredientList.innerHTML = selected.length
      ? groupIngredients(selected).map(([category, rows]) => `
          <div class="wo-selection-group">
            <div class="wo-selection-grouphead">${esc(category)}</div>
            ${rows.map((ingredient) => `
              <div class="wo-selection-row">
                <div>
                  <div class="wo-selection-title">${esc(ingredient.name)}</div>
                  <div class="muted">Default ${fmtPct(ingredient.defaultPct)} | Range ${fmtPct(ingredient.minPct)}-${fmtPct(ingredient.maxPct)}</div>
                </div>
                <span class="wo-selection-tag">${ingredient.builtIn ? "Built-in" : "Custom"}</span>
              </div>
            `).join("")}
          </div>
        `).join("")
      : `<div class="muted">No optional ingredients selected. The calculator will only show the core formula rows.</div>`;
  }

  async function openOvenChecklist() {
    const body = document.createElement("div");
    body.innerHTML = `
      <div class="wo-modal-grid">
        <div>
          <div class="muted">Check the ovens you want available in the calculator. Popular ovens load from the oven database, and custom ovens can be added below.</div>
        </div>
        <div>
          <label class="lbl" for="prefOvenSearch">Search Ovens</label>
          <input class="input" id="prefOvenSearch" placeholder="Search ovens" />
        </div>
        <div class="wo-modal-checklist" id="prefOvenChecklist"></div>
        <div class="wo-modal-form">
          <div class="wo-modal-formhead">Add Custom Oven</div>
          <div class="wo-grid2">
            <input class="input" id="prefCustomOvenName" placeholder="Custom oven name" />
            <input class="input" id="prefCustomOvenType" placeholder="Type" />
            <input class="input" id="prefCustomOvenMin" type="number" min="0" step="1" placeholder="Min temp F" />
            <input class="input" id="prefCustomOvenMax" type="number" min="0" step="1" placeholder="Max temp F" />
          </div>
          <textarea class="input wo-textarea" id="prefCustomOvenNotes" placeholder="Notes" style="margin-top:12px;"></textarea>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn" id="prefAddCustomOven" type="button">Add Custom Oven</button>
          </div>
        </div>
      </div>
    `;

    const searchEl = body.querySelector("#prefOvenSearch");
    const listEl = body.querySelector("#prefOvenChecklist");
    const draftSelected = new Set(prefs.ovens.selectedIds || []);
    let draftCustom = [...(prefs.ovens.custom || [])];
    const catalog = await loadOvenCatalog(store);

    function rows() {
      const builtins = catalog.map((oven) => ({ ...oven, builtin: true }));
      const customs = draftCustom.map((oven) => ({ ...oven, builtin: false }));
      return [...builtins, ...customs];
    }

    function renderList() {
      const query = String(searchEl.value || "").trim().toLowerCase();
      const filtered = rows().filter((oven) => !query || `${oven.name} ${oven.type}`.toLowerCase().includes(query));
      listEl.innerHTML = filtered.length
        ? filtered.map((oven) => `
            <label class="wo-checklist-row">
              <span class="wo-checklist-main">
                <input type="checkbox" data-oven-id="${esc(oven.id)}" ${draftSelected.has(oven.id) ? "checked" : ""} />
                <span>
                  <strong>${esc(oven.name)}</strong>
                  <span class="muted">${esc(`${oven.type} | ${formatTempBand(oven)}`)}</span>
                </span>
              </span>
              <span class="wo-checklist-actions">
                <span class="wo-selection-tag">${oven.builtin ? "Popular" : "Custom"}</span>
                ${oven.builtin ? "" : `<button class="btn ghost sm" type="button" data-remove-oven="${esc(oven.id)}">Delete</button>`}
              </span>
            </label>
          `).join("")
        : `<div class="muted">No ovens match your search.</div>`;

      listEl.querySelectorAll("[data-oven-id]").forEach((input) => {
        input.addEventListener("change", () => {
          const id = input.getAttribute("data-oven-id");
          if (input.checked) draftSelected.add(id); else draftSelected.delete(id);
        });
      });

      listEl.querySelectorAll("[data-remove-oven]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-remove-oven");
          draftSelected.delete(id);
          draftCustom = draftCustom.filter((oven) => oven.id !== id);
          renderList();
        });
      });
    }

    body.querySelector("#prefAddCustomOven").addEventListener("click", () => {
      const name = body.querySelector("#prefCustomOvenName").value.trim();
      if (!name) return;
      const oven = {
        id: slug(`custom_oven_${name}`),
        name,
        type: body.querySelector("#prefCustomOvenType").value.trim() || "custom",
        minTemperature: numberOrNull(body.querySelector("#prefCustomOvenMin").value),
        maxTemperature: numberOrNull(body.querySelector("#prefCustomOvenMax").value),
        notes: body.querySelector("#prefCustomOvenNotes").value.trim()
      };
      draftCustom = [...draftCustom.filter((item) => item.id !== oven.id), oven];
      draftSelected.add(oven.id);
      ["#prefCustomOvenName", "#prefCustomOvenType", "#prefCustomOvenMin", "#prefCustomOvenMax", "#prefCustomOvenNotes"].forEach((selector) => {
        body.querySelector(selector).value = "";
      });
      renderList();
    });

    searchEl.addEventListener("input", renderList);
    renderList();

    showModal({
      title: "Oven Preferences",
      bodyEl: body,
      actions: [{
        label: "Save Ovens",
        primary: true,
        onClick: ({ close }) => {
          commit({
            ...prefs,
            ovens: {
              ...prefs.ovens,
              selectedIds: Array.from(draftSelected).sort(),
              custom: draftCustom,
              defaultOvenId: null
            }
          });
          close();
        }
      }]
    });
  }

  function openIngredientChecklist() {
    const body = document.createElement("div");
    body.innerHTML = `
      <div class="wo-modal-grid">
        <div>
          <div class="muted">Only selected ingredients appear in the calculator. Use the checklist to keep the formula editor focused.</div>
        </div>
        <div class="wo-modal-checklist" id="prefIngredientChecklist"></div>
        <div class="wo-modal-form">
          <div class="wo-modal-formhead">Add Custom Ingredient</div>
          <div class="wo-grid2">
            <input class="input" id="prefCustomIngredientName" placeholder="Ingredient Name" />
            <input class="input" id="prefCustomIngredientCategory" placeholder="Category" />
            <input class="input" id="prefCustomIngredientDefault" type="number" min="0" max="100" step="0.1" placeholder="Default %" />
            <input class="input" id="prefCustomIngredientMin" type="number" min="0" max="100" step="0.1" placeholder="Minimum %" />
            <input class="input" id="prefCustomIngredientMax" type="number" min="0" max="100" step="0.1" placeholder="Maximum %" />
          </div>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn" id="prefAddCustomIngredient" type="button">Add Custom Ingredient</button>
          </div>
        </div>
      </div>
    `;

    const listEl = body.querySelector("#prefIngredientChecklist");
    const draftSelected = new Set(prefs.ingredients.selectedIds || []);
    let draftCustom = [...(prefs.ingredients.custom || [])];

    function rows() {
      return getAllIngredients({
        ...prefs,
        ingredients: {
          ...prefs.ingredients,
          selectedIds: Array.from(draftSelected),
          custom: draftCustom
        }
      });
    }

    function renderList() {
      const grouped = groupIngredients(rows());
      listEl.innerHTML = grouped.map(([category, ingredients]) => `
        <div class="wo-checklist-group">
          <div class="wo-checklist-grouphead">${esc(category)}</div>
          ${ingredients.map((ingredient) => `
            <label class="wo-checklist-row">
              <span class="wo-checklist-main">
                <input type="checkbox" data-ingredient-id="${esc(ingredient.id)}" ${draftSelected.has(ingredient.id) ? "checked" : ""} />
                <span>
                  <strong>${esc(ingredient.name)}</strong>
                  <span class="muted">Default ${fmtPct(ingredient.defaultPct)} | Range ${fmtPct(ingredient.minPct)}-${fmtPct(ingredient.maxPct)}</span>
                </span>
              </span>
              <span class="wo-checklist-actions">
                <span class="wo-selection-tag">${ingredient.builtIn ? "Built-in" : "Custom"}</span>
                ${ingredient.builtIn ? "" : `<button class="btn ghost sm" type="button" data-remove-ingredient="${esc(ingredient.id)}">Delete</button>`}
              </span>
            </label>
          `).join("")}
        </div>
      `).join("");

      listEl.querySelectorAll("[data-ingredient-id]").forEach((input) => {
        input.addEventListener("change", () => {
          const id = input.getAttribute("data-ingredient-id");
          if (input.checked) draftSelected.add(id); else draftSelected.delete(id);
        });
      });

      listEl.querySelectorAll("[data-remove-ingredient]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-remove-ingredient");
          draftSelected.delete(id);
          draftCustom = draftCustom.filter((ingredient) => ingredient.id !== id);
          renderList();
        });
      });
    }

    body.querySelector("#prefAddCustomIngredient").addEventListener("click", () => {
      const name = body.querySelector("#prefCustomIngredientName").value.trim();
      if (!name) return;
      const ingredient = {
        id: slug(`custom_ingredient_${name}`),
        name,
        category: body.querySelector("#prefCustomIngredientCategory").value.trim() || "Custom",
        defaultPct: Number(body.querySelector("#prefCustomIngredientDefault").value || 0),
        minPct: Number(body.querySelector("#prefCustomIngredientMin").value || 0),
        maxPct: Number(body.querySelector("#prefCustomIngredientMax").value || 0)
      };
      draftCustom = [...draftCustom.filter((item) => item.id !== ingredient.id), ingredient];
      draftSelected.add(ingredient.id);
      ["#prefCustomIngredientName", "#prefCustomIngredientCategory", "#prefCustomIngredientDefault", "#prefCustomIngredientMin", "#prefCustomIngredientMax"].forEach((selector) => {
        body.querySelector(selector).value = "";
      });
      renderList();
    });

    renderList();

    showModal({
      title: "Optional Ingredients",
      bodyEl: body,
      actions: [{
        label: "Save Ingredients",
        primary: true,
        onClick: ({ close }) => {
          commit({
            ...prefs,
            ingredients: {
              ...prefs.ingredients,
              selectedIds: Array.from(draftSelected).sort(),
              custom: draftCustom
            }
          });
          close();
        }
      }]
    });
  }

  ui.weightUnit.addEventListener("change", () => commit({
    ...prefs,
    general: { ...prefs.general, weightUnit: ui.weightUnit.value }
  }));

  ui.sizeUnit.addEventListener("change", () => commit({
    ...prefs,
    general: { ...prefs.general, sizeUnit: ui.sizeUnit.value }
  }));

  ui.calcMethod.querySelectorAll("input[name='prefCalcSystem']").forEach((input) => {
    input.addEventListener("change", () => commit({
      ...prefs,
      general: { ...prefs.general, calculationMethod: input.value }
    }));
  });

  ui.ballWeight.addEventListener("input", () => commit({
    ...prefs,
    general: { ...prefs.general, defaultDoughBallWeight: Number(ui.ballWeight.value || prefs.general.defaultDoughBallWeight) }
  }));

  ui.thicknessFactor.addEventListener("input", () => commit({
    ...prefs,
    general: { ...prefs.general, defaultThicknessFactor: Number(ui.thicknessFactor.value || prefs.general.defaultThicknessFactor) }
  }));

  ui.startupWorkflow.addEventListener("change", () => commit({
    ...prefs,
    general: { ...prefs.general, startupWorkflow: ui.startupWorkflow.value }
  }));

  ui.selectOvens.addEventListener("click", openOvenChecklist);

  ui.openFlourBrowser.addEventListener("click", async () => {
    await openFlourPickerModal(store, {
      initialSelectedIds: getFavoriteFlourIds(prefs),
      onUse: (picked) => {
        commit({
          ...prefs,
          flours: {
            ...prefs.flours,
            favoriteIds: (picked || []).map((flour) => flour.id)
          }
        });
      }
    });
  });

  ui.selectIngredients.addEventListener("click", openIngredientChecklist);

  ui.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "prodoughtype.preferences.json";
    anchor.click();
    URL.revokeObjectURL(url);
  });

  ui.resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset all local preferences and clear the saved calculator session?")) return;
    const clean = normalizePrefs({});
    prefs = clean;
    savePrefs(clean);
    store.set("prefs", clean);
    store.del?.("recipeSession");
    store.del?.("currentRecipe");
    render();
  });

  loadFloursForBrowser(store)
    .then((flours) => {
      flourById = new Map(flours.map((flour) => [flour.id, flour]));
      render();
    })
    .catch((error) => console.warn(error));

  render();
  return root;
}

async function loadOvenCatalog(store) {
  const items = store?.get?.("indexes", {})?.databases?.items || [];
  const entry = items.find((item) => item && item.id === "ovens" && item.type === "dataset" && item.file);
  if (!entry) return BUILTIN_OVENS.slice();

  try {
    const response = await fetch(entry.file, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed ${entry.file}: ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.items) ? payload.items : []);
    return rows.length ? rows : BUILTIN_OVENS.slice();
  } catch (error) {
    console.warn(error);
    return BUILTIN_OVENS.slice();
  }
}

function groupIngredients(list) {
  const groups = new Map();
  list.forEach((ingredient) => {
    const key = ingredient.category || "Custom";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ingredient);
  });

  return [...groups.entries()]
    .sort((a, b) => categorySort(a[0]) - categorySort(b[0]) || a[0].localeCompare(b[0]))
    .map(([category, rows]) => [category, rows.sort((a, b) => a.name.localeCompare(b.name))]);
}

function categorySort(category) {
  const index = INGREDIENT_CATEGORY_ORDER.indexOf(category);
  return index === -1 ? INGREDIENT_CATEGORY_ORDER.length : index;
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function formatTempBand(oven) {
  const min = oven?.minTemperature != null ? `${Number(oven.minTemperature)} F` : "-";
  const max = oven?.maxTemperature != null ? `${Number(oven.maxTemperature)} F` : "-";
  return `${min} to ${max}`;
}

function fmtPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function flourName(flour, fallback) {
  return [flour?.brand, flour?.name].filter(Boolean).join(" ").trim() || fallback || "Flour";
}

function map(root, selectors) {
  return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, root.querySelector(selector)]));
}

function wrap(html) {
  const el = document.createElement("div");
  el.innerHTML = html.trim();
  return el.firstElementChild;
}

function slug(value) {
  return String(value || "item").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
