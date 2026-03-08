import { openFlourPickerModal } from "./flourPickerModal.js";
import { loadFloursForBrowser } from "./floursDb.js";
import { BUILTIN_OVENS, getAllOvens, getDefaultBlend, getFavoriteFlourIds, loadPrefs, normalizePrefs, savePrefs } from "./prefs.js";

export function renderWorkOrderPreferences({ store }) {
  let prefs = loadPrefs();
  let flourById = new Map();

  const root = wrap(`
    <div class="prefStack">
      <div class="item"><h4>Preferences</h4><p class="muted">Saved locally to <code>localStorage["pdt.preferences"]</code>. These values define defaults and favorite items, not the recipe itself.</p></div>
      <div class="prefsGrid wo-prefs-grid">
        <div class="prefSection">
          <h4>General</h4>
          <p>Defaults for units, method, warnings, and analysis.</p>
          <div class="wo-grid2" style="margin-top:12px;">
            <div><label class="lbl">Weight unit</label><select class="input" id="prefWeightUnit"><option value="grams">Grams</option><option value="ounces">Ounces</option></select></div>
            <div><label class="lbl">Size unit</label><select class="input" id="prefSizeUnit"><option value="inches">Inches</option><option value="centimeters">Centimeters</option></select></div>
            <div><label class="lbl">Calculation method</label><select class="input" id="prefCalcMethod"><option value="DBW">DBW</option><option value="TF">TF</option></select></div>
            <div><label class="lbl">Default dough ball weight (g)</label><input class="input" id="prefBallWeight" type="number" min="50" max="2000" step="1" /></div>
            <div><label class="lbl">Default thickness factor</label><input class="input" id="prefTf" type="number" min="0.05" max="0.2" step="0.001" /></div>
            <div><label class="checkrow"><input id="prefWarnings" type="checkbox" /><span>Show warnings</span></label><label class="checkrow" style="margin-top:10px;"><input id="prefAnalysis" type="checkbox" /><span>Enable dough analysis</span></label></div>
          </div>
        </div>
        <div class="prefSection">
          <h4>Workflow Modules</h4>
          <p>Optional calculator sections.</p>
          <div class="wo-toggle-list" id="prefWorkflow" style="margin-top:12px;"></div>
        </div>
        <div class="prefSection">
          <h4>Oven Library Manager</h4>
          <p>Favorite built-in ovens, set a default oven, and add custom ovens.</p>
          <div class="wo-library-list" id="prefOvenLibrary" style="margin-top:12px;"></div>
          <div class="wo-grid2" style="margin-top:12px;"><input class="input" id="prefOvenName" placeholder="Custom oven name" /><input class="input" id="prefOvenType" placeholder="Type" /><input class="input" id="prefOvenMin" type="number" min="0" step="1" placeholder="Min temp F" /><input class="input" id="prefOvenMax" type="number" min="0" step="1" placeholder="Max temp F" /></div>
          <textarea class="input wo-textarea" id="prefOvenNotes" placeholder="Notes" style="margin-top:12px;"></textarea>
          <div class="wo-inline-actions" style="margin-top:12px;"><button class="btn primary" id="prefAddOven" type="button">Add Custom Oven</button></div>
        </div>
        <div class="prefSection">
          <h4>Flours</h4>
          <p>Choose favorite flours, define a default blend, and add custom flour entries.</p>
          <div class="wo-inline-actions" style="margin-top:12px;"><button class="btn" id="prefChooseFavorites" type="button">Choose Favorite Flours</button><button class="btn ghost" id="prefEvenSplit" type="button">Even Split Default Blend</button></div>
          <div class="wo-library-list" id="prefFlourLibrary" style="margin-top:12px;"></div>
          <div class="wo-grid2" style="margin-top:12px;"><input class="input" id="prefFlourName" placeholder="Flour name" /><input class="input" id="prefFlourBrand" placeholder="Brand" /><select class="input" id="prefFlourType"><option value="00">00</option><option value="AP">AP</option><option value="Bread">Bread</option><option value="High Gluten">High Gluten</option><option value="Whole Wheat">Whole Wheat</option><option value="Manitoba">Manitoba</option><option value="Other">Other</option></select><input class="input" id="prefFlourProtein" type="number" min="0" max="30" step="0.1" placeholder="Protein %" /><input class="input" id="prefFlourAbsMin" type="number" min="0" max="100" step="0.1" placeholder="Abs min %" /><input class="input" id="prefFlourAbsMax" type="number" min="0" max="100" step="0.1" placeholder="Abs max %" /></div>
          <div class="wo-grid2" style="margin-top:12px;"><input class="input" id="prefFlourW" type="number" min="0" max="600" step="1" placeholder="W value" /><input class="input" id="prefFlourPL" type="number" min="0" max="10" step="0.1" placeholder="P/L ratio" /><label class="checkrow"><input id="prefFlourMalted" type="checkbox" /><span>Malted</span></label></div>
          <textarea class="input wo-textarea" id="prefFlourNotes" placeholder="Notes" style="margin-top:12px;"></textarea>
          <div class="wo-inline-actions" style="margin-top:12px;"><button class="btn primary" id="prefAddFlour" type="button">Add Custom Flour</button></div>
        </div>
      </div>
    </div>
  `);

  const ui = map(root, {
    weightUnit: "#prefWeightUnit", sizeUnit: "#prefSizeUnit", calcMethod: "#prefCalcMethod", ballWeight: "#prefBallWeight", tf: "#prefTf", warnings: "#prefWarnings", analysis: "#prefAnalysis", workflow: "#prefWorkflow",
    ovenLibrary: "#prefOvenLibrary", ovenName: "#prefOvenName", ovenType: "#prefOvenType", ovenMin: "#prefOvenMin", ovenMax: "#prefOvenMax", ovenNotes: "#prefOvenNotes", addOven: "#prefAddOven",
    chooseFavorites: "#prefChooseFavorites", evenSplit: "#prefEvenSplit", flourLibrary: "#prefFlourLibrary", flourName: "#prefFlourName", flourBrand: "#prefFlourBrand", flourType: "#prefFlourType", flourProtein: "#prefFlourProtein", flourAbsMin: "#prefFlourAbsMin", flourAbsMax: "#prefFlourAbsMax", flourW: "#prefFlourW", flourPL: "#prefFlourPL", flourMalted: "#prefFlourMalted", flourNotes: "#prefFlourNotes", addFlour: "#prefAddFlour"
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
    ui.calcMethod.value = prefs.general.calculationMethod;
    ui.ballWeight.value = String(prefs.general.defaultDoughBallWeight);
    ui.tf.value = String(prefs.general.defaultThicknessFactor);
    ui.warnings.checked = prefs.general.showWarnings;
    ui.analysis.checked = prefs.general.enableDoughAnalysis;
    renderWorkflow();
    renderOvens();
    renderFlours();
  }

  function renderWorkflow() {
    const items = [["Preferments", "preferments"], ["Toppings", "toppings"], ["Sauce", "sauce"], ["Dough Analysis", "doughAnalysis"]];
    ui.workflow.innerHTML = items.map(([label, key]) => `<label class="checkrow"><input type="checkbox" data-flow="${esc(key)}" ${prefs.workflow[key] ? "checked" : ""} /><span>${esc(label)}</span></label>`).join("");
    ui.workflow.querySelectorAll("[data-flow]").forEach((input) => input.addEventListener("change", () => commit({ ...prefs, workflow: { ...prefs.workflow, [input.getAttribute("data-flow")]: input.checked } })));
  }

  function renderOvens() {
    const ovens = getAllOvens(prefs);
    ui.ovenLibrary.innerHTML = ovens.map((oven) => `<div class="wo-library-row"><div><div class="wo-library-title">${esc(oven.name)}</div><div class="muted">${esc(`${oven.type} | ${oven.minTemperature || "-"}-${oven.maxTemperature || "-"} F`)}${oven.builtin ? " | Built-in" : " | Custom"}</div></div><div class="wo-library-actions"><label class="checkrow"><input type="checkbox" data-oven-favorite="${esc(oven.id)}" ${oven.favorite ? "checked" : ""} /><span>Favorite</span></label><label class="checkrow"><input type="radio" name="prefDefaultOven" data-oven-default="${esc(oven.id)}" ${prefs.ovens.defaultOvenId === oven.id ? "checked" : ""} /><span>Default</span></label>${oven.builtin ? "" : `<button class="btn ghost sm" type="button" data-remove-oven="${esc(oven.id)}">Remove</button>`}</div></div>`).join("");
    ui.ovenLibrary.querySelectorAll("[data-oven-favorite]").forEach((input) => input.addEventListener("change", () => {
      const id = input.getAttribute("data-oven-favorite");
      const next = new Set(prefs.ovens.favoriteIds || []);
      if (input.checked) next.add(id); else next.delete(id);
      commit({ ...prefs, ovens: { ...prefs.ovens, favoriteIds: Array.from(next).sort() } });
    }));
    ui.ovenLibrary.querySelectorAll("[data-oven-default]").forEach((input) => input.addEventListener("change", () => commit({ ...prefs, ovens: { ...prefs.ovens, defaultOvenId: input.getAttribute("data-oven-default") } })));
    ui.ovenLibrary.querySelectorAll("[data-remove-oven]").forEach((button) => button.addEventListener("click", () => {
      const id = button.getAttribute("data-remove-oven");
      commit({ ...prefs, ovens: { ...prefs.ovens, favoriteIds: (prefs.ovens.favoriteIds || []).filter((item) => item !== id), custom: (prefs.ovens.custom || []).filter((oven) => oven.id !== id), defaultOvenId: prefs.ovens.defaultOvenId === id ? BUILTIN_OVENS[0].id : prefs.ovens.defaultOvenId } });
    }));
  }

  function renderFlours() {
    const favoriteIds = getFavoriteFlourIds(prefs);
    const defaultIds = new Set((prefs.flours.defaultBlend || []).map((row) => row.id));
    ui.flourLibrary.innerHTML = favoriteIds.length
      ? favoriteIds.map((id) => `<div class="wo-library-row"><div><div class="wo-library-title">${esc(flourName(flourById.get(id), id))}</div><div class="muted">${esc(flourById.get(id)?.type || "Favorite flour")}</div></div><div class="wo-library-actions"><label class="checkrow"><input type="checkbox" data-default-flour="${esc(id)}" ${defaultIds.has(id) ? "checked" : ""} /><span>Default blend</span></label><input class="input wo-pct-input" type="number" min="0" max="100" step="1" data-default-pct="${esc(id)}" value="${findPct(prefs.flours.defaultBlend, id)}" ${defaultIds.has(id) ? "" : "disabled"} /><span class="muted">%</span>${prefs.flours.custom.some((flour) => flour.id === id) ? `<button class="btn ghost sm" type="button" data-remove-flour="${esc(id)}">Remove</button>` : ""}</div></div>`).join("")
      : `<div class="muted">No favorite flours yet. Use the flour picker to choose favorites.</div>`;
    ui.flourLibrary.querySelectorAll("[data-default-flour]").forEach((input) => input.addEventListener("change", () => {
      const id = input.getAttribute("data-default-flour");
      let next = (prefs.flours.defaultBlend || []).filter((row) => row.id !== id);
      if (input.checked) next.push({ id, pct: 0 });
      commit({ ...prefs, flours: { ...prefs.flours, defaultBlend: evenSplit(next) } });
    }));
    ui.flourLibrary.querySelectorAll("[data-default-pct]").forEach((input) => input.addEventListener("input", () => {
      const id = input.getAttribute("data-default-pct");
      const next = (prefs.flours.defaultBlend || []).map((row) => row.id === id ? { ...row, pct: Number(input.value || 0) } : row);
      commit({ ...prefs, flours: { ...prefs.flours, defaultBlend: next } });
    }));
    ui.flourLibrary.querySelectorAll("[data-remove-flour]").forEach((button) => button.addEventListener("click", () => {
      const id = button.getAttribute("data-remove-flour");
      commit({ ...prefs, flours: { ...prefs.flours, favoriteIds: favoriteIds.filter((item) => item !== id), custom: prefs.flours.custom.filter((item) => item.id !== id), defaultBlend: (prefs.flours.defaultBlend || []).filter((row) => row.id !== id) } });
    }));
  }

  ui.weightUnit.addEventListener("change", () => commit({ ...prefs, general: { ...prefs.general, weightUnit: ui.weightUnit.value } }));
  ui.sizeUnit.addEventListener("change", () => commit({ ...prefs, general: { ...prefs.general, sizeUnit: ui.sizeUnit.value } }));
  ui.calcMethod.addEventListener("change", () => commit({ ...prefs, general: { ...prefs.general, calculationMethod: ui.calcMethod.value } }));
  ui.ballWeight.addEventListener("input", () => commit({ ...prefs, general: { ...prefs.general, defaultDoughBallWeight: Number(ui.ballWeight.value || prefs.general.defaultDoughBallWeight) } }));
  ui.tf.addEventListener("input", () => commit({ ...prefs, general: { ...prefs.general, defaultThicknessFactor: Number(ui.tf.value || prefs.general.defaultThicknessFactor) } }));
  ui.warnings.addEventListener("change", () => commit({ ...prefs, general: { ...prefs.general, showWarnings: ui.warnings.checked } }));
  ui.analysis.addEventListener("change", () => commit({ ...prefs, general: { ...prefs.general, enableDoughAnalysis: ui.analysis.checked } }));

  ui.addOven.addEventListener("click", () => {
    const name = ui.ovenName.value.trim();
    if (!name) return;
    commit({ ...prefs, ovens: { ...prefs.ovens, custom: [...(prefs.ovens.custom || []), { id: slug(`custom_oven_${name}`), name, type: ui.ovenType.value.trim() || "custom", minTemperature: Number(ui.ovenMin.value || 0) || null, maxTemperature: Number(ui.ovenMax.value || 0) || null, notes: ui.ovenNotes.value.trim() }] } });
    [ui.ovenName, ui.ovenType, ui.ovenMin, ui.ovenMax, ui.ovenNotes].forEach((el) => { el.value = ""; });
  });

  ui.chooseFavorites.addEventListener("click", async () => {
    await openFlourPickerModal(store, { initialSelectedIds: getFavoriteFlourIds(prefs), onUse: (picked) => { const favoriteIds = (picked || []).map((flour) => flour.id); const defaultBlend = (prefs.flours.defaultBlend || []).filter((row) => favoriteIds.includes(row.id)); commit({ ...prefs, flours: { ...prefs.flours, favoriteIds, defaultBlend: defaultBlend.length ? defaultBlend : getDefaultBlend({ ...prefs, flours: { ...prefs.flours, favoriteIds } }) } }); } });
  });
  ui.evenSplit.addEventListener("click", () => commit({ ...prefs, flours: { ...prefs.flours, defaultBlend: evenSplit(prefs.flours.defaultBlend || []) } }));
  ui.addFlour.addEventListener("click", () => {
    const name = ui.flourName.value.trim();
    if (!name) return;
    const custom = [...(prefs.flours.custom || []), { id: slug(`custom_flour_${name}`), name, brand: ui.flourBrand.value.trim() || "Custom", type: ui.flourType.value, proteinPct: Number(ui.flourProtein.value || 0) || null, absorption: { minPct: Number(ui.flourAbsMin.value || 0) || null, maxPct: Number(ui.flourAbsMax.value || 0) || null, basis: "bakers_pct" }, malted: ui.flourMalted.checked, specs: { w: ui.flourW.value ? { min: Number(ui.flourW.value), max: Number(ui.flourW.value) } : null, pl: ui.flourPL.value ? { min: Number(ui.flourPL.value), max: Number(ui.flourPL.value) } : null }, notes: ui.flourNotes.value.trim() }];
    const favoriteIds = Array.from(new Set([...(prefs.flours.favoriteIds || []), custom[custom.length - 1].id]));
    commit({ ...prefs, flours: { ...prefs.flours, custom, favoriteIds } });
    [ui.flourName, ui.flourBrand, ui.flourProtein, ui.flourAbsMin, ui.flourAbsMax, ui.flourW, ui.flourPL, ui.flourNotes].forEach((el) => { el.value = ""; });
    ui.flourType.value = "00"; ui.flourMalted.checked = false;
  });

  loadFloursForBrowser(store).then((flours) => { flourById = new Map(flours.map((flour) => [flour.id, flour])); render(); }).catch((error) => console.warn(error));
  render();
  return root;
}

function evenSplit(rows) { const list = (rows || []).filter((row) => row?.id); if (!list.length) return []; const base = Math.floor(100 / list.length); let remainder = 100 - base * list.length; return list.map((row) => ({ ...row, pct: base + (remainder-- > 0 ? 1 : 0) })); }
function findPct(rows, id) { return (rows || []).find((row) => row.id === id)?.pct || 0; }
function flourName(flour, fallback) { return [flour?.brand, flour?.name].filter(Boolean).join(" ").trim() || fallback || "Flour"; }
function map(root, selectors) { return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, root.querySelector(selector)])); }
function wrap(html) { const el = document.createElement("div"); el.innerHTML = html.trim(); return el.firstElementChild; }
function slug(value) { return String(value || "item").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item"; }
function esc(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
