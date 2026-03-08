
import { openFlourPickerModal } from "./flourPickerModal.js";
import { loadFloursForBrowser } from "./floursDb.js";
import { getAllOvens, getDefaultBlend, getFavoriteFlourIds, getFavoriteOvens, loadPrefs } from "./prefs.js";
import {
  TEMPLATE_LIBRARY,
  applyTemplateToSession,
  computeRecipe,
  createRecipeSession,
  formatWeight,
  fromDisplayLength,
  fromDisplayWeight,
  importRecipePayload,
  normalizeSession,
  toDisplayLength,
  toDisplayWeight
} from "./workOrderRecipe.js";
import { showModal } from "./modal.js";

export function renderWorkOrderCalculator({ store, onPreview, onOpenKB }) {
  let prefs = loadPrefs();
  let session = store.get("recipeSession", null);
  session = session?.version ? normalizeSession(session, prefs) : createRecipeSession(prefs);

  let flourCatalog = [];
  let flourById = new Map();

  const root = wrap(`
    <div class="wo-shell">
      <input id="woImportFile" type="file" accept="application/json,.json" class="hidden" />
      <div class="step wo-step">
        <div class="stephead wo-stephead">
          <div>
            <div class="steptitle">Step 1 - Foundation</div>
            <div class="stepsub">Templates, geometry, flour selection, and recipe defaults.</div>
          </div>
          <div class="wo-actionbar">
            <button class="btn ghost sm" id="woTemplates" type="button">Templates</button>
            <button class="btn ghost sm" id="woImport" type="button">Import</button>
            <button class="btn ghost sm" id="woCustom" type="button">Custom</button>
            <button class="btn ghost sm" id="woHelp" type="button">Help</button>
            <button class="btn primary sm" id="woQuick" type="button">Quick Setup</button>
          </div>
        </div>
        <div class="stepbody">
          <div class="foundation-grid wo-foundation-grid">
            <div class="wo-col">
              <div class="field">
                <div class="fieldtop"><div class="fieldlbl"><span>Units and Formula</span></div></div>
                <div class="wo-grid2">
                  <div><label class="lbl">Weight unit</label><select class="input" id="woWeightUnit"><option value="grams">Grams</option><option value="ounces">Ounces</option></select></div>
                  <div><label class="lbl">Size unit</label><select class="input" id="woSizeUnit"><option value="inches">Inches</option><option value="centimeters">Centimeters</option></select></div>
                  <div><label class="lbl">Calculation method</label><select class="input" id="woCalcMethod"><option value="DBW">DBW</option><option value="TF">TF</option></select></div>
                  <div><label class="lbl">Dough balls</label><input class="input" id="woDoughCount" type="number" min="1" step="1" /></div>
                  <div><label class="lbl" id="woBallWeightLabel">Dough ball weight</label><input class="input" id="woBallWeight" type="number" min="1" step="1" /></div>
                  <div><label class="lbl">Thickness factor</label><input class="input" id="woTf" type="number" min="0.05" max="0.2" step="0.001" /></div>
                  <div><label class="lbl">Hydration %</label><input class="input" id="woHydration" type="number" min="45" max="90" step="0.5" /></div>
                  <div><label class="lbl">Oven</label><select class="input" id="woOven"></select></div>
                </div>
              </div>
              <div class="field">
                <div class="fieldtop"><div class="fieldlbl"><span>Geometry</span></div></div>
                <div class="wo-grid2">
                  <div><label class="lbl">Shape</label><select class="input" id="woShape"><option value="round">Round</option><option value="rectangular">Rectangular</option></select></div>
                  <div><label class="lbl">Surface type</label><select class="input" id="woSurface"><option value="deck">Deck</option><option value="pan">Pan</option></select></div>
                  <div id="woRoundWrap"><label class="lbl" id="woDiameterLabel">Diameter</label><input class="input" id="woDiameter" type="number" min="1" step="0.1" /></div>
                  <div id="woRectWrap" class="wo-grid2 hidden">
                    <div><label class="lbl" id="woWidthLabel">Width</label><input class="input" id="woWidth" type="number" min="1" step="0.1" /></div>
                    <div><label class="lbl" id="woLengthLabel">Length</label><input class="input" id="woLength" type="number" min="1" step="0.1" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="wo-col">
              <div class="field">
                <div class="fieldtop"><div class="fieldlbl"><span>Flour Selection</span></div><div class="muted" id="woBlendMeta">Favorites load from Preferences.</div></div>
                <div class="wo-grid2">
                  <div><label class="lbl">Favorite flours</label><select class="input" id="woFavoriteFlour"></select></div>
                  <div class="wo-inline-end"><button class="btn ghost" id="woAddFavoriteFlour" type="button">Add Favorite</button></div>
                </div>
                <div class="wo-inline-actions" style="margin-top:12px;">
                  <button class="btn" id="woBrowseFlours" type="button">Browse All Flours</button>
                  <button class="btn ghost" id="woEvenSplitBlend" type="button">Even Split</button>
                  <button class="btn ghost" id="woDefaultBlend" type="button">Use Default Blend</button>
                  <button class="btn ghost" id="woClearBlend" type="button">Clear Blend</button>
                </div>
                <div class="wo-blend-editor" id="woBlendEditor"></div>
                <div class="wo-blend-stats" id="woBlendStats"></div>
              </div>
              <div class="item wo-summary-card" id="woFoundationSummary"></div>
            </div>
          </div>
          <div class="wo-step-actions"><button class="btn primary" id="woNextFermentation" type="button">Next: Fermentation</button></div>
        </div>
      </div>
      <div class="step wo-step" id="woFermentationSection">
        <div class="stephead"><div><div class="steptitle">Step 2 - Fermentation</div><div class="stepsub">Time, temperature, yeast model, and preferment settings.</div></div></div>
        <div class="stepbody">
          <div class="wo-grid2">
            <div><label class="lbl">Total fermentation (hours)</label><input class="input" id="woDuration" type="number" min="4" max="168" step="1" /></div>
            <div><label class="lbl">Cold fermentation (hours)</label><input class="input" id="woColdHours" type="number" min="0" max="144" step="1" /></div>
            <div><label class="lbl">Room temperature (F)</label><input class="input" id="woRoomTemp" type="number" min="45" max="100" step="1" /></div>
            <div><label class="lbl">Dough temperature (F)</label><input class="input" id="woDoughTemp" type="number" min="45" max="100" step="1" /></div>
            <div><label class="lbl">Yeast model</label><select class="input" id="woYeastModel"></select></div>
            <div><label class="lbl">Preferment workflow</label><select class="input" id="woPrefermentEnabled"><option value="false">Disabled</option><option value="true">Enabled</option></select></div>
          </div>
          <div class="wo-grid3 hidden" id="woPrefermentFields" style="margin-top:12px;">
            <div><label class="lbl">Preferment type</label><select class="input" id="woPrefermentType"><option value="poolish">Poolish</option><option value="biga">Biga</option></select></div>
            <div><label class="lbl">Preferment hydration %</label><input class="input" id="woPrefermentHydration" type="number" min="45" max="120" step="1" /></div>
            <div><label class="lbl">Preferment flour %</label><input class="input" id="woPrefermentPercent" type="number" min="5" max="60" step="1" /></div>
          </div>
          <div class="wo-step-actions"><button class="btn ghost" id="woOpenKB" type="button">Open KB</button><button class="btn primary" id="woNextOptional" type="button">Next: Optional Modules</button></div>
        </div>
      </div>
      <div class="step wo-step" id="woOptionalSection"><div class="stephead"><div><div class="steptitle">Step 3 - Optional Modules</div><div class="stepsub">Enabled modules appear here and Dough Analysis stays before Live Preview.</div></div></div><div class="stepbody" id="woOptionalBody"></div></div>
      <div class="step wo-step" id="woAnalysisSection"><div class="stephead"><div><div class="steptitle">Step 4 - Dough Analysis</div><div class="stepsub">Traffic-light guidance before the preview/export step.</div></div></div><div class="stepbody" id="woAnalysisBody"></div></div>
      <div class="step wo-step" id="woPreviewSection"><div class="stephead"><div><div class="steptitle">Step 5 - Live Preview</div><div class="stepsub">The right panel is always the export surface for the current recipe.</div></div></div><div class="stepbody"><div class="item"><h4>Preview Workflow</h4><p class="muted" id="woPreviewNote"></p></div><div class="wo-step-actions"><button class="btn primary" id="woFinish" type="button">Finish</button></div></div></div>
    </div>
  `);

  const ui = map(root, {
    importFile: "#woImportFile", templates: "#woTemplates", importBtn: "#woImport", custom: "#woCustom", help: "#woHelp", quick: "#woQuick",
    weightUnit: "#woWeightUnit", sizeUnit: "#woSizeUnit", calcMethod: "#woCalcMethod", doughCount: "#woDoughCount", ballWeight: "#woBallWeight", ballWeightLabel: "#woBallWeightLabel", tf: "#woTf", hydration: "#woHydration", oven: "#woOven",
    shape: "#woShape", surface: "#woSurface", diameter: "#woDiameter", width: "#woWidth", length: "#woLength", diameterLabel: "#woDiameterLabel", widthLabel: "#woWidthLabel", lengthLabel: "#woLengthLabel", roundWrap: "#woRoundWrap", rectWrap: "#woRectWrap",
    favoriteFlour: "#woFavoriteFlour", addFavoriteFlour: "#woAddFavoriteFlour", browseFlours: "#woBrowseFlours", evenSplitBlend: "#woEvenSplitBlend", defaultBlend: "#woDefaultBlend", clearBlend: "#woClearBlend", blendEditor: "#woBlendEditor", blendStats: "#woBlendStats", blendMeta: "#woBlendMeta", foundationSummary: "#woFoundationSummary",
    nextFermentation: "#woNextFermentation", fermentationSection: "#woFermentationSection", duration: "#woDuration", coldHours: "#woColdHours", roomTemp: "#woRoomTemp", doughTemp: "#woDoughTemp", yeastModel: "#woYeastModel", prefermentEnabled: "#woPrefermentEnabled", prefermentFields: "#woPrefermentFields", prefermentType: "#woPrefermentType", prefermentHydration: "#woPrefermentHydration", prefermentPercent: "#woPrefermentPercent", openKB: "#woOpenKB", nextOptional: "#woNextOptional",
    optionalSection: "#woOptionalSection", optionalBody: "#woOptionalBody", analysisSection: "#woAnalysisSection", analysisBody: "#woAnalysisBody", previewSection: "#woPreviewSection", previewNote: "#woPreviewNote", finish: "#woFinish"
  });

  function refresh() {
    prefs = loadPrefs();
    session = normalizeSession(session, prefs);
    store.set("recipeSession", session);
    const recipe = computeRecipe(session, prefs, flourCatalog);
    store.set("currentRecipe", recipe);
    syncForm();
    renderBlend(recipe);
    renderFoundation(recipe);
    renderOptional(recipe);
    renderAnalysis(recipe);
    ui.previewNote.textContent = recipe.complete
      ? "Live Preview in the right panel is current. Copy recipe, export file, and QR export live there."
      : "Complete the recipe inputs to produce a stable export payload in the preview.";
    onPreview?.(previewHtml(recipe));
  }
  function syncForm() {
    ui.weightUnit.value = session.weightUnit;
    ui.sizeUnit.value = session.sizeUnit;
    ui.calcMethod.value = session.calcMethod;
    ui.doughCount.value = String(session.doughCount);
    ui.ballWeight.value = String(toDisplayWeight(session.doughBallWeight, session.weightUnit));
    ui.tf.value = session.thicknessFactor.toFixed(3);
    ui.hydration.value = String(session.hydrationPct);
    ui.shape.value = session.shape;
    ui.surface.value = session.surfaceType;
    ui.diameter.value = String(toDisplayLength(session.diameterIn, session.sizeUnit));
    ui.width.value = String(toDisplayLength(session.widthIn, session.sizeUnit));
    ui.length.value = String(toDisplayLength(session.lengthIn, session.sizeUnit));
    ui.duration.value = String(session.fermentation.durationHours);
    ui.coldHours.value = String(session.fermentation.coldFermentHours);
    ui.roomTemp.value = String(session.fermentation.roomTempF);
    ui.doughTemp.value = String(session.fermentation.doughTempF);
    ui.prefermentEnabled.value = String(session.fermentation.prefermentEnabled);
    ui.prefermentType.value = session.fermentation.prefermentType;
    ui.prefermentHydration.value = String(session.fermentation.prefermentHydration);
    ui.prefermentPercent.value = String(session.fermentation.prefermentPercent);
    ui.prefermentFields.classList.toggle("hidden", !session.workflow.preferments || !session.fermentation.prefermentEnabled);
    ui.roundWrap.classList.toggle("hidden", session.shape !== "round");
    ui.rectWrap.classList.toggle("hidden", session.shape !== "rectangular");
    ui.ballWeightLabel.textContent = `Dough ball weight (${session.weightUnit === "ounces" ? "oz" : "g"})`;
    ui.diameterLabel.textContent = `Diameter (${session.sizeUnit === "centimeters" ? "cm" : "in"})`;
    ui.widthLabel.textContent = `Width (${session.sizeUnit === "centimeters" ? "cm" : "in"})`;
    ui.lengthLabel.textContent = `Length (${session.sizeUnit === "centimeters" ? "cm" : "in"})`;
    fillOvens(ui.oven, prefs, session.ovenId);
    fillYeastModels(ui.yeastModel, store, session.fermentation.yeastModel);
    fillFavorites(ui.favoriteFlour, prefs, flourById);
  }

  function renderBlend(recipe) {
    const rows = session.flourBlend.map((row) => ({ ...row, flour: flourById.get(row.id) || null }));
    ui.blendMeta.textContent = rows.length ? `${rows.length} flour${rows.length === 1 ? "" : "s"} selected` : "Add favorite flours or browse the full flour picker.";
    ui.blendEditor.innerHTML = rows.length
      ? rows.map((row) => `<div class="wo-blend-row"><div><div class="wo-blend-name">${esc(flourName(row.flour, row.id))}</div><div class="muted">${esc(row.flour?.type || "Unresolved")}</div></div><div class="wo-blend-controls"><input class="input wo-pct-input" type="number" min="0" max="100" step="1" value="${row.pct}" data-pct="${esc(row.id)}" /><span class="muted">%</span><button class="btn ghost sm" type="button" data-remove="${esc(row.id)}">Remove</button></div></div>`).join("")
      : `<div class="muted">No flours selected yet.</div>`;
    ui.blendEditor.querySelectorAll("[data-pct]").forEach((input) => bind(input, "input", () => { const id = input.getAttribute("data-pct"); session.flourBlend = session.flourBlend.map((row) => row.id === id ? { ...row, pct: Number(input.value || 0) } : row); refresh(); }));
    ui.blendEditor.querySelectorAll("[data-remove]").forEach((button) => bind(button, "click", () => { const id = button.getAttribute("data-remove"); session.flourBlend = session.flourBlend.filter((row) => row.id !== id); refresh(); }));
    const protein = recipe.blendStats.proteinPct != null ? `${recipe.blendStats.proteinPct}%` : "--";
    const absorption = recipe.blendStats.absorption ? `${recipe.blendStats.absorption.minPct}-${recipe.blendStats.absorption.maxPct}%` : "--";
    ui.blendStats.innerHTML = `<div class="wo-stat-card"><div class="muted">Blend</div><strong>${esc(rows.map((row) => flourName(row.flour, row.id)).join(", ") || "No blend selected")}</strong></div><div class="wo-stat-card"><div class="muted">Average protein</div><strong>${esc(protein)}</strong></div><div class="wo-stat-card"><div class="muted">Average absorption</div><strong>${esc(absorption)}</strong></div>`;
  }

  function renderFoundation(recipe) {
    ui.foundationSummary.innerHTML = `<h4>Foundation Snapshot</h4><p class="muted">${esc(recipe.labels.size)} | ${esc(recipe.labels.surface)} | ${esc(recipe.labels.calculation)} | ${esc(recipe.labels.oven)}</p><div class="wo-summary-grid"><div><span class="muted">Total dough</span><strong>${esc(recipe.labels.totalDough)}</strong></div><div><span class="muted">Ball weight</span><strong>${esc(recipe.labels.ballWeight)}</strong></div><div><span class="muted">Hydration</span><strong>${recipe.percentages.hydrationPct}%</strong></div><div><span class="muted">Yeast</span><strong>${recipe.percentages.yeastPct}%</strong></div></div>`;
  }

  function renderOptional() {
    const blocks = [];
    if (session.workflow.toppings) blocks.push(`<div class="field"><div class="fieldtop"><div class="fieldlbl"><span>Toppings</span></div></div><textarea class="input wo-textarea" id="woToppingsNotes" placeholder="Notes, ingredient helpers, or topping weights...">${esc(session.optional.toppingsNotes || "")}</textarea></div>`);
    if (session.workflow.sauce) blocks.push(`<div class="field"><div class="fieldtop"><div class="fieldlbl"><span>Sauce</span></div></div><textarea class="input wo-textarea" id="woSauceNotes" placeholder="Sauce builder notes...">${esc(session.optional.sauceNotes || "")}</textarea></div>`);
    if (!blocks.length) blocks.push(`<div class="item"><h4>No optional modules enabled</h4><p class="muted">Enable Toppings, Sauce, or Dough Analysis in Preferences or Quick Setup to extend the calculator workflow.</p></div>`);
    blocks.push(`<div class="wo-step-actions"><button class="btn primary" id="woNextAnalysis" type="button">Next: ${session.analysisEnabled && session.workflow.doughAnalysis ? "Dough Analysis" : "Live Preview"}</button></div>`);
    ui.optionalBody.innerHTML = blocks.join("");
    root.querySelector("#woToppingsNotes")?.addEventListener("input", (event) => { session.optional.toppingsNotes = event.target.value || ""; refresh(); });
    root.querySelector("#woSauceNotes")?.addEventListener("input", (event) => { session.optional.sauceNotes = event.target.value || ""; refresh(); });
    root.querySelector("#woNextAnalysis")?.addEventListener("click", () => scrollTo(session.analysisEnabled && session.workflow.doughAnalysis ? ui.analysisSection : ui.previewSection));
  }

  function renderAnalysis(recipe) {
    const enabled = session.analysisEnabled && session.workflow.doughAnalysis;
    ui.analysisSection.classList.toggle("hidden", !enabled);
    if (!enabled) return;
    ui.analysisBody.innerHTML = `<div class="wo-analysis-list">${analysisLine("Hydration vs Flour Strength", recipe.analysis.hydration.signal, recipe.analysis.hydration.text)}${analysisLine("Fermentation Duration", recipe.analysis.fermentation.signal, recipe.analysis.fermentation.text)}${analysisLine("Oven Compatibility", recipe.analysis.oven.signal, recipe.analysis.oven.text)}</div><div class="item" style="margin-top:12px;"><h4>Advisory Suggestions</h4><ul class="wo-list">${recipe.analysis.suggestions.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div><div class="wo-step-actions"><button class="btn primary" id="woNextPreview" type="button">Next: Live Preview</button></div>`;
    root.querySelector("#woNextPreview")?.addEventListener("click", () => scrollTo(ui.previewSection));
  }

  function previewHtml(recipe) {
    const warnings = recipe.warnings.length ? `<div class="item" style="margin-top:12px;"><h4>Warnings</h4><ul class="wo-list">${recipe.warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul></div>` : "";
    const preferment = recipe.preferment ? `<div class="item" style="margin-top:12px;"><h4>Preferment</h4><p class="muted">${esc(recipe.preferment.type)} at ${recipe.preferment.hydration}% hydration using ${recipe.preferment.percent}% of total flour.</p><div class="wo-summary-grid"><div><span class="muted">Preferment flour</span><strong>${esc(formatWeight(recipe.preferment.flourG, recipe.session.weightUnit))}</strong></div><div><span class="muted">Preferment water</span><strong>${esc(formatWeight(recipe.preferment.waterG, recipe.session.weightUnit))}</strong></div></div></div>` : "";
    return `<div class="wo-preview-actions"><button class="btn primary" type="button" data-preview-action="copy">Copy Recipe</button><button class="btn ghost" type="button" data-preview-action="download">Export File</button><button class="btn ghost" type="button" data-preview-action="qr">Generate QR</button></div><div class="item" style="margin-top:12px;"><h4>Recipe Card</h4><p class="muted">${esc(recipe.labels.size)} | ${esc(recipe.labels.oven)} | ${esc(recipe.labels.surface)}</p><div class="wo-summary-grid"><div><span class="muted">Total dough</span><strong>${esc(recipe.labels.totalDough)}</strong></div><div><span class="muted">Ball weight</span><strong>${esc(recipe.labels.ballWeight)}</strong></div><div><span class="muted">Hydration</span><strong>${recipe.percentages.hydrationPct}%</strong></div><div><span class="muted">Yeast</span><strong>${recipe.percentages.yeastPct}%</strong></div></div></div><div class="item" style="margin-top:12px;"><h4>Ingredient Weights</h4><div class="wo-summary-grid"><div><span class="muted">Flour</span><strong>${esc(formatWeight(recipe.totals.flourG, recipe.session.weightUnit))}</strong></div><div><span class="muted">Water</span><strong>${esc(formatWeight(recipe.totals.waterG, recipe.session.weightUnit))}</strong></div><div><span class="muted">Salt</span><strong>${esc(formatWeight(recipe.totals.saltG, recipe.session.weightUnit))}</strong></div><div><span class="muted">Yeast</span><strong>${esc(formatWeight(recipe.totals.yeastG, recipe.session.weightUnit))}</strong></div></div></div><div class="item" style="margin-top:12px;"><h4>Blend</h4><p class="muted">${esc(recipe.blend.map((row) => `${flourName(row.flour, row.id)} (${row.pct}%)`).join(", ") || "No blend selected")}</p></div>${preferment}<div class="item" style="margin-top:12px;"><h4>Fermentation Timeline</h4><ul class="wo-list">${recipe.fermentationTimeline.map((step) => `<li><strong>${esc(step.label)}:</strong> ${esc(step.detail)}</li>`).join("")}</ul></div>${warnings}`;
  }

  async function hydrateFlours() {
    flourCatalog = await loadFloursForBrowser(store);
    flourById = new Map(flourCatalog.map((flour) => [flour.id, flour]));
  }

  function openTemplates() {
    const body = document.createElement("div");
    body.className = "wo-modal-grid";
    TEMPLATE_LIBRARY.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wo-template-option";
      button.innerHTML = `<strong>${esc(template.name)}</strong><span>${esc(template.summary)}</span>`;
      button.addEventListener("click", () => { session = applyTemplateToSession(session, template.id, prefs); refresh(); modal.close(); });
      body.appendChild(button);
    });
    const modal = showModal({ title: "Templates", bodyEl: body });
  }

  function helpModal() {
    const body = document.createElement("div");
    body.innerHTML = `<div class="muted" style="line-height:1.5;">Foundation starts the recipe, Fermentation sets timing, optional modules appear from preferences, Dough Analysis stays before Live Preview, and Live Preview always contains the export actions.</div>`;
    showModal({ title: "How to Use This Section", bodyEl: body });
  }
  function quickSetup() {
    const body = document.createElement("div");
    body.innerHTML = `<div class="wo-grid2"><div><label class="lbl">Weight unit</label><select class="input" id="qsWeight"><option value="grams">Grams</option><option value="ounces">Ounces</option></select></div><div><label class="lbl">Size unit</label><select class="input" id="qsSize"><option value="inches">Inches</option><option value="centimeters">Centimeters</option></select></div><div><label class="lbl">Calculation method</label><select class="input" id="qsCalc"><option value="DBW">DBW</option><option value="TF">TF</option></select></div><div><label class="lbl">Oven</label><select class="input" id="qsOven"></select></div></div><div class="wo-toggle-list" style="margin-top:12px;"><label class="checkrow"><input id="qsWarnings" type="checkbox" ${session.warningsEnabled ? "checked" : ""} /><span>Warnings</span></label><label class="checkrow"><input id="qsAnalysis" type="checkbox" ${session.analysisEnabled ? "checked" : ""} /><span>Analysis</span></label><label class="checkrow"><input id="qsPreferments" type="checkbox" ${session.workflow.preferments ? "checked" : ""} /><span>Preferments</span></label><label class="checkrow"><input id="qsToppings" type="checkbox" ${session.workflow.toppings ? "checked" : ""} /><span>Toppings</span></label><label class="checkrow"><input id="qsSauce" type="checkbox" ${session.workflow.sauce ? "checked" : ""} /><span>Sauce</span></label><label class="checkrow"><input id="qsDoughAnalysis" type="checkbox" ${session.workflow.doughAnalysis ? "checked" : ""} /><span>Dough Analysis Module</span></label></div>`;
    const modal = showModal({ title: "Quick Setup", bodyEl: body, actions: [{ label: "Apply", primary: true, onClick: ({ close }) => { session.weightUnit = body.querySelector("#qsWeight").value; session.sizeUnit = body.querySelector("#qsSize").value; session.calcMethod = body.querySelector("#qsCalc").value; session.ovenId = body.querySelector("#qsOven").value; session.warningsEnabled = body.querySelector("#qsWarnings").checked; session.analysisEnabled = body.querySelector("#qsAnalysis").checked; session.workflow.preferments = body.querySelector("#qsPreferments").checked; session.workflow.toppings = body.querySelector("#qsToppings").checked; session.workflow.sauce = body.querySelector("#qsSauce").checked; session.workflow.doughAnalysis = body.querySelector("#qsDoughAnalysis").checked; refresh(); close(); } }] });
    body.querySelector("#qsWeight").value = session.weightUnit;
    body.querySelector("#qsSize").value = session.sizeUnit;
    body.querySelector("#qsCalc").value = session.calcMethod;
    fillOvens(body.querySelector("#qsOven"), prefs, session.ovenId);
  }

  bind(ui.templates, "click", openTemplates);
  bind(ui.importBtn, "click", () => ui.importFile.click());
  bind(ui.custom, "click", () => { session = createRecipeSession(prefs); refresh(); });
  bind(ui.help, "click", helpModal);
  bind(ui.quick, "click", quickSetup);
  bind(ui.nextFermentation, "click", () => scrollTo(ui.fermentationSection));
  bind(ui.nextOptional, "click", () => scrollTo(ui.optionalSection));
  bind(ui.openKB, "click", () => onOpenKB?.());
  bind(ui.finish, "click", () => scrollTo(ui.previewSection));

  bind(ui.importFile, "change", async () => {
    const file = ui.importFile.files?.[0];
    if (!file) return;
    try { session = importRecipePayload(await file.text(), prefs); refresh(); }
    catch (error) { window.alert(error.message || "Could not import recipe file."); }
    finally { ui.importFile.value = ""; }
  });

  bind(ui.weightUnit, "change", () => { session.weightUnit = ui.weightUnit.value; refresh(); });
  bind(ui.sizeUnit, "change", () => { session.sizeUnit = ui.sizeUnit.value; refresh(); });
  bind(ui.calcMethod, "change", () => { session.calcMethod = ui.calcMethod.value; refresh(); });
  bind(ui.doughCount, "input", () => { session.doughCount = Number(ui.doughCount.value || 1); refresh(); });
  bind(ui.ballWeight, "input", () => { session.doughBallWeight = fromDisplayWeight(ui.ballWeight.value, session.weightUnit); refresh(); });
  bind(ui.tf, "input", () => { session.thicknessFactor = Number(ui.tf.value || 0.1); refresh(); });
  bind(ui.hydration, "input", () => { session.hydrationPct = Number(ui.hydration.value || 62); refresh(); });
  bind(ui.oven, "change", () => { session.ovenId = ui.oven.value; refresh(); });
  bind(ui.shape, "change", () => { session.shape = ui.shape.value; refresh(); });
  bind(ui.surface, "change", () => { session.surfaceType = ui.surface.value; refresh(); });
  bind(ui.diameter, "input", () => { session.diameterIn = fromDisplayLength(ui.diameter.value, session.sizeUnit); refresh(); });
  bind(ui.width, "input", () => { session.widthIn = fromDisplayLength(ui.width.value, session.sizeUnit); refresh(); });
  bind(ui.length, "input", () => { session.lengthIn = fromDisplayLength(ui.length.value, session.sizeUnit); refresh(); });
  bind(ui.duration, "input", () => { session.fermentation.durationHours = Number(ui.duration.value || 24); refresh(); });
  bind(ui.coldHours, "input", () => { session.fermentation.coldFermentHours = Number(ui.coldHours.value || 0); refresh(); });
  bind(ui.roomTemp, "input", () => { session.fermentation.roomTempF = Number(ui.roomTemp.value || 70); refresh(); });
  bind(ui.doughTemp, "input", () => { session.fermentation.doughTempF = Number(ui.doughTemp.value || 70); refresh(); });
  bind(ui.yeastModel, "change", () => { session.fermentation.yeastModel = ui.yeastModel.value; refresh(); });
  bind(ui.prefermentEnabled, "change", () => { session.fermentation.prefermentEnabled = ui.prefermentEnabled.value === "true"; refresh(); });
  bind(ui.prefermentType, "change", () => { session.fermentation.prefermentType = ui.prefermentType.value; refresh(); });
  bind(ui.prefermentHydration, "input", () => { session.fermentation.prefermentHydration = Number(ui.prefermentHydration.value || 100); refresh(); });
  bind(ui.prefermentPercent, "input", () => { session.fermentation.prefermentPercent = Number(ui.prefermentPercent.value || 20); refresh(); });
  bind(ui.addFavoriteFlour, "click", () => { const id = ui.favoriteFlour.value; if (id && !session.flourBlend.some((row) => row.id === id)) { session.flourBlend = evenSplit([...session.flourBlend, { id, pct: 0 }]); refresh(); } });
  bind(ui.evenSplitBlend, "click", () => { session.flourBlend = evenSplit(session.flourBlend); refresh(); });
  bind(ui.defaultBlend, "click", () => { session.flourBlend = getDefaultBlend(prefs); refresh(); });
  bind(ui.clearBlend, "click", () => { session.flourBlend = []; refresh(); });
  bind(ui.browseFlours, "click", async () => {
    await openFlourPickerModal(store, {
      initialSelectedIds: session.flourBlend.map((row) => row.id),
      onUse: (picked) => {
        const next = (picked || []).map((flour) => ({ id: flour.id, pct: session.flourBlend.find((row) => row.id === flour.id)?.pct || 0 }));
        session.flourBlend = evenSplit(next);
        refresh();
      }
    });
  });

  hydrateFlours().catch((error) => { console.warn(error); ui.blendMeta.textContent = "Flour catalog failed to load."; refresh(); });
  refresh();
  return root;
}

function fillOvens(selectEl, prefs, selectedId) {
  const favorites = getFavoriteOvens(prefs);
  const list = favorites.length ? favorites : getAllOvens(prefs);
  selectEl.innerHTML = list.map((oven) => `<option value="${esc(oven.id)}">${esc(oven.name)}</option>`).join("");
  if (list.some((oven) => oven.id === selectedId)) selectEl.value = selectedId;
}

function fillYeastModels(selectEl, store, selectedId) {
  const models = store.get("indexes", {})?.fermentationModels?.items || [];
  selectEl.innerHTML = models.map((model) => `<option value="${esc(model.id)}">${esc(model.name)}</option>`).join("");
  if (models.some((model) => model.id === selectedId)) selectEl.value = selectedId;
}

function fillFavorites(selectEl, prefs, flourById) {
  const ids = getFavoriteFlourIds(prefs);
  if (!ids.length) {
    selectEl.innerHTML = `<option value="">No favorite flours yet</option>`;
    selectEl.disabled = true;
    return;
  }
  selectEl.disabled = false;
  selectEl.innerHTML = ids.map((id) => `<option value="${esc(id)}">${esc(flourName(flourById.get(id), id))}</option>`).join("");
}

function evenSplit(rows) {
  const list = (rows || []).filter((row) => row?.id);
  if (!list.length) return [];
  const base = Math.floor(100 / list.length);
  let remainder = 100 - base * list.length;
  return list.map((row) => ({ ...row, pct: base + (remainder-- > 0 ? 1 : 0) }));
}

function analysisLine(label, signal, text) {
  const cls = { green: "g", amber: "a", red: "r", gray: "gray" }[signal] || "gray";
  return `<div class="wo-analysis-row"><div class="wo-analysis-head"><span class="sig ${cls}"></span><strong>${esc(label)}</strong></div><div class="muted">${esc(text)}</div></div>`;
}

function flourName(flour, fallback) { return [flour?.brand, flour?.name].filter(Boolean).join(" ").trim() || fallback || "Flour"; }
function bind(node, event, handler) { node?.addEventListener(event, handler); }
function scrollTo(node) { node?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function map(root, selectors) { return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, root.querySelector(selector)])); }
function wrap(html) { const el = document.createElement("div"); el.innerHTML = html.trim(); return el.firstElementChild; }
function esc(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
