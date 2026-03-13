import { openFlourPickerModal } from "./flourPickerModal.js";
import { loadFloursForBrowser } from "./floursDb.js";
import {
  getAllIngredients,
  getAllOvens,
  getFavoriteFlourIds,
  loadPrefs,
  normalizePrefs,
  savePrefs
} from "./prefs.js";
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

const STEP_ORDER = ["foundation", "fermentation", "flour", "formula", "optional", "analysis", "preview"];
const BASE_SALT_PCT = 2.8;
const TEMPLATE_LOADING_MESSAGE = "Template loading will be enabled in a future update.";

export function renderWorkOrderCalculator({ store, onPreview, onOpenKB }) {
  let prefs = loadPrefs();
  const shouldForceStartup = window.__PDT_FORCE_STARTUP__ === true;
  let session = shouldForceStartup ? null : store.get("recipeSession", null);
  session = session?.version ? normalizeCalculatorSession(session, prefs) : createSessionFromPrefs(prefs);
  if (shouldForceStartup) window.__PDT_FORCE_STARTUP__ = false;

  const pendingTemplateId = store.get("pendingTemplateId", null);
  if (pendingTemplateId) {
    store.del?.("pendingTemplateId");
    if (TEMPLATE_LIBRARY.some((template) => template.id === pendingTemplateId)) {
      session = normalizeCalculatorSession(applyTemplateToSession(session, pendingTemplateId, prefs), prefs);
    }
  }
  let flourCatalog = [];
  let flourById = new Map();
  let openStep = "foundation";
  let foundationAdvancedOpen = false;
  let fermentationAdvancedOpen = false;

  const root = wrap(`
    <div class="wo-shell">
      <input id="woImportFile" type="file" accept="application/json,.json" class="hidden" />

      <div class="step wo-step" id="woStepFoundation" data-step-root="foundation">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div>
              <div class="steptitle">Step 1 - Style Selector</div>
              <div class="stepsub">Choose the dough style first, then fine-tune geometry and formula settings below.</div>
            </div>
            <div class="muted wo-step-mini" id="woFoundationMeta"></div>
          </div>
          <div class="wo-stephead-actions">
            <div class="wo-actionbar">
              <button class="btn ghost sm" id="woStyleRound" type="button">Round</button>
              <button class="btn ghost sm" id="woStyleSquare" type="button">Square</button>
              <button class="btn ghost sm" id="woStylePan" type="button">Pan</button>
              <button class="btn ghost sm" id="woRecipe" type="button">Recipe</button>
              <button class="btn ghost sm wo-iconbtn" id="woConfigure" type="button" title="Configure Calculator" aria-label="Configure Calculator">&#9881;</button>
              <button class="btn ghost sm" id="woHelp" type="button" title="Calculator Help" aria-label="Calculator Help">?</button>
            </div>
          </div>
        </div>
        <div class="stepbody">
          <div class="wo-round-foundation" id="woRoundFoundation">
            <div class="wo-round-grid">
              <div class="wo-round-field" id="woRoundDiameterField">
                <label class="wo-round-label" id="woRoundDiameterLabel" for="woRoundDiameter">Diameter</label>
                <div class="wo-round-inputwrap" data-scrub-target="woRoundDiameter" data-scrub-step="0.1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundDiameter" data-stepper-delta="-0.1" aria-label="Decrease diameter">-</button>
                  <input class="input wo-round-input" id="woRoundDiameter" type="number" min="1" step="0.1" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundDiameter" data-stepper-delta="0.1" aria-label="Increase diameter">+</button>
                  <span class="wo-round-unit" id="woRoundDiameterUnit">in</span>
                </div>
              </div>
              <div class="wo-round-field hidden" id="woRoundWidthField">
                <label class="wo-round-label" id="woRoundWidthLabel" for="woRoundWidth">Width</label>
                <div class="wo-round-inputwrap" data-scrub-target="woRoundWidth" data-scrub-step="0.1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundWidth" data-stepper-delta="-0.1" aria-label="Decrease width">-</button>
                  <input class="input wo-round-input" id="woRoundWidth" type="number" min="1" step="0.1" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundWidth" data-stepper-delta="0.1" aria-label="Increase width">+</button>
                  <span class="wo-round-unit" id="woRoundWidthUnit">in</span>
                </div>
              </div>
              <div class="wo-round-field hidden" id="woRoundLengthField">
                <label class="wo-round-label" id="woRoundLengthLabel" for="woRoundLength">Length</label>
                <div class="wo-round-inputwrap" data-scrub-target="woRoundLength" data-scrub-step="0.1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundLength" data-stepper-delta="-0.1" aria-label="Decrease length">-</button>
                  <input class="input wo-round-input" id="woRoundLength" type="number" min="1" step="0.1" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundLength" data-stepper-delta="0.1" aria-label="Increase length">+</button>
                  <span class="wo-round-unit" id="woRoundLengthUnit">in</span>
                </div>
              </div>
              <div class="wo-round-field">
                <label class="wo-round-label" for="woRoundDoughCount">Balls</label>
                <div class="wo-round-inputwrap" data-scrub-target="woRoundDoughCount" data-scrub-step="1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundDoughCount" data-stepper-delta="-1" aria-label="Decrease dough balls">-</button>
                  <input class="input wo-round-input" id="woRoundDoughCount" type="number" min="1" step="1" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundDoughCount" data-stepper-delta="1" aria-label="Increase dough balls">+</button>
                </div>
              </div>
              <div class="wo-round-field" id="woRoundDriverField">
                <label class="wo-round-label" id="woRoundDriverLabel" for="woRoundTf">Thickness Factor</label>
                <div class="wo-round-inputwrap" id="woRoundTfWrap" data-scrub-target="woRoundTf" data-scrub-step="0.001" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundTf" data-stepper-delta="-0.001" aria-label="Decrease thickness factor">-</button>
                  <input class="input wo-round-input" id="woRoundTf" type="number" min="0.05" max="0.2" step="0.001" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundTf" data-stepper-delta="0.001" aria-label="Increase thickness factor">+</button>
                </div>
                <div class="wo-round-inputwrap hidden" id="woRoundBallWeightWrap" data-scrub-target="woRoundBallWeight" data-scrub-step="1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundBallWeight" data-stepper-delta="-1" aria-label="Decrease dough weight">-</button>
                  <input class="input wo-round-input" id="woRoundBallWeight" type="number" min="1" step="1" />
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoundBallWeight" data-stepper-delta="1" aria-label="Increase dough weight">+</button>
                  <span class="wo-round-unit" id="woRoundDriverUnit">g</span>
                </div>
              </div>
              <div class="wo-round-field">
                <label class="wo-round-label" id="woRoundTotalLabel" for="woTotalWeightDisplay">Total Weight</label>
                <div class="wo-round-inputwrap">
                  <input class="input wo-round-input" id="woTotalWeightDisplay" type="text" readonly />
                  <span class="wo-round-unit" id="woRoundTotalUnit">g</span>
                </div>
              </div>
            </div>
          </div>

          <div class="hidden" aria-hidden="true">
            <div id="woRoundWrap">
              <label class="lbl" id="woDiameterLabel">Diameter</label>
              <input class="input" id="woDiameter" type="number" min="1" step="0.1" />
            </div>
            <div id="woRectWrap" class="wo-grid2">
              <div><label class="lbl" id="woWidthLabel">Pan Width</label><input class="input" id="woWidth" type="number" min="1" step="0.1" /></div>
              <div><label class="lbl" id="woLengthLabel">Pan Length</label><input class="input" id="woLength" type="number" min="1" step="0.1" /></div>
            </div>
            <div class="fieldtop"><div class="fieldlbl"><span>Geometry</span></div><div class="muted" id="woGeometryMeta">Defaults come from Preferences and Quick Setup.</div></div>
            <div class="fieldtop"><div class="fieldlbl"><span>Formula Driver</span></div><div class="muted" id="woFormulaMeta"></div></div>
            <input class="input" id="woDoughCount" type="number" min="1" step="1" />
            <input class="input" id="woHydration" type="number" min="45" max="90" step="0.1" />
            <div id="woTfControl"><input class="input" id="woTf" type="number" min="0.05" max="0.2" step="0.001" /></div>
            <div id="woBallWeightControl">
              <label class="lbl" id="woBallWeightLabel" for="woBallWeight">Dough Weight</label>
              <input class="input" id="woBallWeight" type="number" min="1" step="1" />
            </div>
            <div class="item wo-summary-card" id="woFoundationSummary"></div>
            <button class="btn ghost" id="woImport" type="button">Import</button>
            <button class="btn ghost" id="woCustom" type="button">Custom</button>
            <button class="btn primary" id="woQuick" type="button">Quick Setup</button>
            <button class="btn ghost" id="woAdvancedToggle" type="button" aria-expanded="false">Advanced Settings</button>
            <div class="field" id="woAdvancedPanel">
              <select class="input" id="woWeightUnit"><option value="grams">Grams</option><option value="ounces">Ounces</option></select>
              <select class="input" id="woSizeUnit"><option value="inches">Inches</option><option value="centimeters">Centimeters</option></select>
              <select class="input" id="woSurface"><option value="deck">Deck</option><option value="pan">Pan</option></select>
              <select class="input" id="woOven"></select>
              <select class="input" id="woCalcMethod"><option value="DBW">DBW</option><option value="TF">TF</option></select>
              <select class="input" id="woShape"><option value="round">Round</option><option value="rectangular">Rectangular</option></select>
            </div>
          </div>

          <div class="wo-step-actions"><button class="btn primary" id="woNextFlour" type="button">Continue to Fermentation</button></div>
        </div>
      </div>

      <div class="step wo-step" id="woStepFermentation" data-step-root="fermentation">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 2 - Fermentation Method</div><div class="stepsub">Choose direct dough or a preferment, then dial in the timing and preferment percentages.</div></div>
            <div class="muted wo-step-mini" id="woFermentationMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="fermentation" id="woOpenFermentation" type="button">Open</button></div>
        </div>
        <div class="stepbody">
          <div class="wo-ferment-shell">
            <div class="wo-ferment-headline">
              <div class="wo-ferment-badge" id="woFermentBadge">2</div>
              <div class="wo-ferment-copy">
                <div class="wo-ferment-title">Fermentation Method</div>
                <div class="wo-ferment-sub">Direct dough or preferment</div>
              </div>
              <div class="wo-ferment-status" id="woFermentStatus">In Progress</div>
            </div>

            <div class="wo-ferment-methods" id="woFermentMethods">
              <button class="wo-method-card" id="woMethodDirect" type="button" data-method="direct">
                <span class="wo-method-name">Direct Dough</span>
                <span class="wo-method-note">No preferment</span>
              </button>
              <button class="wo-method-card" id="woMethodBiga" type="button" data-method="biga">
                <span class="wo-method-name">Biga</span>
                <span class="wo-method-note">Stiff preferment</span>
              </button>
              <button class="wo-method-card" id="woMethodPoolish" type="button" data-method="poolish">
                <span class="wo-method-name">Poolish</span>
                <span class="wo-method-note">Liquid preferment</span>
              </button>
              <button class="wo-method-card" id="woMethodSourdough" type="button" data-method="sourdough">
                <span class="wo-method-name">Sourdough</span>
                <span class="wo-method-note">Natural leaven</span>
              </button>
            </div>

            <div class="wo-ferment-slider-wrap" id="woPrefermentSliderWrap">
              <div class="wo-ferment-slider-head">
                <div>
                  <div class="wo-ferment-label">Preferment Flour %</div>
                  <div class="muted">1% - 100%</div>
                </div>
                <strong id="woPrefermentPercentReadout">20%</strong>
              </div>
              <input class="wo-ferment-slider" id="woPrefermentPercentRange" type="range" min="1" max="100" step="1" />
            </div>

            <div class="wo-ferment-controls">
              <div class="wo-ferment-control" id="woPrefermentHydrationCard">
                <label class="wo-ferment-label" for="woPrefermentHydrationDisplay">Preferment Hydration %</label>
                <div class="wo-ferment-stepper" data-scrub-target="woPrefermentHydrationDisplay" data-scrub-step="1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woPrefermentHydrationDisplay" data-stepper-delta="-1" aria-label="Decrease preferment hydration">-</button>
                  <input class="input wo-round-input" id="woPrefermentHydrationDisplay" type="number" min="45" max="120" step="1" />
                  <span class="wo-round-unit">%</span>
                  <button class="wo-round-stepper" type="button" data-stepper-target="woPrefermentHydrationDisplay" data-stepper-delta="1" aria-label="Increase preferment hydration">+</button>
                </div>
              </div>
              <div class="wo-ferment-control">
                <label class="wo-ferment-label" for="woDurationDisplay">Fermentation Time</label>
                <div class="wo-ferment-stepper" data-scrub-target="woDurationDisplay" data-scrub-step="1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woDurationDisplay" data-stepper-delta="-1" aria-label="Decrease fermentation time">-</button>
                  <input class="input wo-round-input" id="woDurationDisplay" type="number" min="4" max="168" step="1" />
                  <span class="wo-round-unit">hrs</span>
                  <button class="wo-round-stepper" type="button" data-stepper-target="woDurationDisplay" data-stepper-delta="1" aria-label="Increase fermentation time">+</button>
                </div>
              </div>
              <div class="wo-ferment-control">
                <label class="wo-ferment-label" for="woRoomTempDisplay">Temperature</label>
                <div class="wo-ferment-stepper" data-scrub-target="woRoomTempDisplay" data-scrub-step="1" title="Drag left or right to adjust">
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoomTempDisplay" data-stepper-delta="-1" aria-label="Decrease temperature">-</button>
                  <input class="input wo-round-input" id="woRoomTempDisplay" type="number" min="45" max="100" step="1" />
                  <span class="wo-round-unit">F</span>
                  <button class="wo-round-stepper" type="button" data-stepper-target="woRoomTempDisplay" data-stepper-delta="1" aria-label="Increase temperature">+</button>
                </div>
              </div>
            </div>
          </div>

          <div class="hidden" aria-hidden="true">
            <select class="input" id="woYeastModel"></select>
            <select class="input" id="woYeastMode"><option value="auto">Auto Yeast</option><option value="manual">Manual Yeast %</option></select>
            <div class="field" id="woManualYeastWrap"><input class="input" id="woManualYeastPct" type="number" min="0" max="5" step="0.01" /></div>
            <button class="btn ghost" id="woFermentAdvancedToggle" type="button" aria-expanded="false">Advanced Fermentation</button>
            <div class="field" id="woFermentAdvancedPanel">
              <input class="input" id="woColdHours" type="number" min="0" max="144" step="1" />
              <input class="input" id="woDoughTemp" type="number" min="45" max="100" step="1" />
              <select class="input" id="woPrefermentEnabled"><option value="false">Disabled</option><option value="true">Enabled</option></select>
              <div id="woPrefermentFields">
                <select class="input" id="woPrefermentType"><option value="poolish">Poolish</option><option value="biga">Biga</option><option value="sourdough">Sourdough</option></select>
                <input class="input" id="woPrefermentHydration" type="number" min="45" max="120" step="1" />
                <input class="input" id="woPrefermentPercent" type="number" min="5" max="60" step="1" />
              </div>
            </div>
            <input class="input" id="woDuration" type="number" min="4" max="168" step="1" />
            <input class="input" id="woRoomTemp" type="number" min="45" max="100" step="1" />
          </div>

          <div class="wo-step-actions"><button class="btn primary" id="woNextOptional" type="button">Continue to Flour</button></div>
        </div>
      </div>

      <div class="step wo-step" id="woStepFlour" data-step-root="flour">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 3 - Flour</div><div class="stepsub">Keep flour browsing and blending separate from the base dough inputs.</div></div>
            <div class="muted wo-step-mini" id="woFlourMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="flour" id="woOpenFlour" type="button">Open</button></div>
        </div>
        <div class="stepbody">
          <div class="field">
            <div class="fieldtop">
              <div class="fieldlbl"><span>Choose 1 or more flours</span></div>
              <div class="wo-inline-end"><button class="btn ghost" id="woAddFavoriteFlour" type="button">Add Flour</button></div>
            </div>
            <div class="muted" id="woBlendMeta">None selected by default. Blend totals stay at 100%.</div>
            <div class="hidden"><select class="input" id="woFavoriteFlour"></select></div>
            <div class="wo-blend-editor" id="woBlendEditor"></div>
            <div class="hidden"><button class="btn" id="woBrowseFlours" type="button">Browse All Flours</button></div>
            <div class="hidden"><button class="btn ghost hidden" id="woEvenSplitBlend" type="button">Even Split</button></div>
            <div class="hidden"><button class="btn ghost hidden" id="woClearBlend" type="button">Clear Blend</button></div>
            <div class="wo-blend-stats" id="woBlendStats"></div>
          </div>
          <div class="wo-step-actions"><button class="btn primary" id="woNextFormula" type="button">Continue to Dough Formula</button></div>
        </div>
      </div>

      <div class="step wo-step" id="woStepFormula" data-step-root="formula">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 4 - Dough Formula</div><div class="stepsub">Compact baker's percentage inputs for salt, olive oil, and the optional ingredients selected in Preferences.</div></div>
            <div class="muted wo-step-mini" id="woFormulaStepMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="formula" id="woOpenFormula" type="button">Open</button></div>
        </div>
        <div class="stepbody">
          <div class="item wo-formula-note" id="woFormulaNote"></div>
          <div class="wo-formula-list" id="woFormulaList"></div>
          <div class="wo-inline-actions" style="margin-top:12px;">
            <button class="btn" id="woAddIngredient" type="button">Add Ingredient</button>
          </div>
          <div class="wo-step-actions"><button class="btn primary" id="woNextFermentation" type="button">Continue to Optional Modules</button></div>
        </div>
      </div>

      <div class="step wo-step" id="woStepOptional" data-step-root="optional">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 5 - Optional Modules</div><div class="stepsub">Keep sauce, toppings, and future add-ons collapsed until the core dough is set.</div></div>
            <div class="muted wo-step-mini" id="woOptionalMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="optional" id="woOpenOptional" type="button">Open</button></div>
        </div>
        <div class="stepbody" id="woOptionalBody"></div>
      </div>

      <div class="step wo-step" id="woStepAnalysis" data-step-root="analysis">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 6 - Dough Analysis</div><div class="stepsub">Advisory signals sit in their own checkpoint before the export step.</div></div>
            <div class="muted wo-step-mini" id="woAnalysisMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="analysis" id="woOpenAnalysis" type="button">Open</button></div>
        </div>
        <div class="stepbody" id="woAnalysisBody"></div>
      </div>

      <div class="step wo-step" id="woStepPreview" data-step-root="preview">
        <div class="stephead wo-stephead">
          <div class="wo-stephead-copy">
            <div><div class="steptitle">Step 7 - Live Preview</div><div class="stepsub">The recipe card, export actions, and QR output remain in the right panel and update live.</div></div>
            <div class="muted wo-step-mini" id="woPreviewMeta"></div>
          </div>
          <div class="wo-stephead-actions"><button class="btn ghost sm" data-step-open="preview" id="woOpenPreview" type="button">Open</button></div>
        </div>
        <div class="stepbody">
          <div class="item wo-summary-card" id="woPreviewSummary"></div>
          <div class="wo-step-actions"><button class="btn ghost" id="woPreviewKB" type="button">Open KB</button></div>
        </div>
      </div>
    </div>
  `);

  const ui = map(root, {
    importFile: "#woImportFile",
    styleRound: "#woStyleRound",
    styleSquare: "#woStyleSquare",
    stylePan: "#woStylePan",
    recipe: "#woRecipe",
    configure: "#woConfigure",
    importBtn: "#woImport",
    custom: "#woCustom",
    help: "#woHelp",
    quick: "#woQuick",
    roundFoundation: "#woRoundFoundation",
    roundDiameterField: "#woRoundDiameterField",
    roundDiameterLabel: "#woRoundDiameterLabel",
    roundDiameterUnit: "#woRoundDiameterUnit",
    roundDiameter: "#woRoundDiameter",
    roundWidthField: "#woRoundWidthField",
    roundWidthLabel: "#woRoundWidthLabel",
    roundWidthUnit: "#woRoundWidthUnit",
    roundWidth: "#woRoundWidth",
    roundLengthField: "#woRoundLengthField",
    roundLengthLabel: "#woRoundLengthLabel",
    roundLengthUnit: "#woRoundLengthUnit",
    roundLength: "#woRoundLength",
    roundDoughCount: "#woRoundDoughCount",
    roundDriverField: "#woRoundDriverField",
    roundDriverLabel: "#woRoundDriverLabel",
    roundTfWrap: "#woRoundTfWrap",
    roundTf: "#woRoundTf",
    roundBallWeightWrap: "#woRoundBallWeightWrap",
    roundBallWeight: "#woRoundBallWeight",
    roundDriverUnit: "#woRoundDriverUnit",
    totalWeightDisplay: "#woTotalWeightDisplay",
    roundTotalUnit: "#woRoundTotalUnit",
    foundationMeta: "#woFoundationMeta",
    geometryMeta: "#woGeometryMeta",
    formulaMeta: "#woFormulaMeta",
    foundationSummary: "#woFoundationSummary",
    advancedToggle: "#woAdvancedToggle",
    advancedPanel: "#woAdvancedPanel",
    weightUnit: "#woWeightUnit",
    sizeUnit: "#woSizeUnit",
    surface: "#woSurface",
    oven: "#woOven",
    calcMethod: "#woCalcMethod",
    shape: "#woShape",
    roundWrap: "#woRoundWrap",
    rectWrap: "#woRectWrap",
    diameterLabel: "#woDiameterLabel",
    widthLabel: "#woWidthLabel",
    lengthLabel: "#woLengthLabel",
    diameter: "#woDiameter",
    width: "#woWidth",
    length: "#woLength",
    doughCount: "#woDoughCount",
    hydration: "#woHydration",
    tfControl: "#woTfControl",
    tf: "#woTf",
    ballWeightControl: "#woBallWeightControl",
    ballWeightLabel: "#woBallWeightLabel",
    ballWeight: "#woBallWeight",
    nextFlour: "#woNextFlour",
    flourMeta: "#woFlourMeta",
    favoriteFlour: "#woFavoriteFlour",
    addFavoriteFlour: "#woAddFavoriteFlour",
    browseFlours: "#woBrowseFlours",
    evenSplitBlend: "#woEvenSplitBlend",
    clearBlend: "#woClearBlend",
    blendEditor: "#woBlendEditor",
    blendStats: "#woBlendStats",
    blendMeta: "#woBlendMeta",
    nextFormula: "#woNextFormula",
    formulaStepMeta: "#woFormulaStepMeta",
    formulaNote: "#woFormulaNote",
    formulaList: "#woFormulaList",
    addIngredient: "#woAddIngredient",
    nextFermentation: "#woNextFermentation",
    fermentationMeta: "#woFermentationMeta",
    fermentBadge: "#woFermentBadge",
    fermentStatus: "#woFermentStatus",
    methodDirect: "#woMethodDirect",
    methodBiga: "#woMethodBiga",
    methodPoolish: "#woMethodPoolish",
    methodSourdough: "#woMethodSourdough",
    prefermentSliderWrap: "#woPrefermentSliderWrap",
    prefermentPercentRange: "#woPrefermentPercentRange",
    prefermentPercentReadout: "#woPrefermentPercentReadout",
    prefermentHydrationCard: "#woPrefermentHydrationCard",
    prefermentHydrationDisplay: "#woPrefermentHydrationDisplay",
    durationDisplay: "#woDurationDisplay",
    roomTempDisplay: "#woRoomTempDisplay",
    duration: "#woDuration",
    roomTemp: "#woRoomTemp",
    yeastModel: "#woYeastModel",
    yeastMode: "#woYeastMode",
    manualYeastWrap: "#woManualYeastWrap",
    manualYeastPct: "#woManualYeastPct",
    fermentAdvancedToggle: "#woFermentAdvancedToggle",
    fermentAdvancedPanel: "#woFermentAdvancedPanel",
    coldHours: "#woColdHours",
    doughTemp: "#woDoughTemp",
    prefermentEnabled: "#woPrefermentEnabled",
    prefermentFields: "#woPrefermentFields",
    prefermentType: "#woPrefermentType",
    prefermentHydration: "#woPrefermentHydration",
    prefermentPercent: "#woPrefermentPercent",
    nextOptional: "#woNextOptional",
    optionalMeta: "#woOptionalMeta",
    optionalBody: "#woOptionalBody",
    analysisMeta: "#woAnalysisMeta",
    analysisBody: "#woAnalysisBody",
    previewMeta: "#woPreviewMeta",
    previewSummary: "#woPreviewSummary",
    previewKB: "#woPreviewKB"
  });

  const stepNodes = Object.fromEntries(STEP_ORDER.map((step) => [step, root.querySelector(`[data-step-root="${step}"]`)]));

  if (window.PDT) {
    window.PDT.updatePreviewNotes = (value) => {
      session.notes = String(value || "");
      session = normalizeCalculatorSession(session, prefs);
      store.set("recipeSession", session);
      store.set("currentRecipe", computeRecipe(session, prefs, flourCatalog));
    };
  }

  function refresh() {
    prefs = loadPrefs();
    session = normalizeCalculatorSession(session, prefs);
    store.set("recipeSession", session);

    const recipe = computeRecipe(session, prefs, flourCatalog);
    store.set("currentRecipe", recipe);

    syncForm(recipe);
    renderAccordion();
    renderBlend(recipe);
    renderFoundation(recipe);
    renderFormula(recipe);
    renderFermentation(recipe);
    renderOptional(recipe);
    renderAnalysis(recipe);
    renderPreviewStep(recipe);
    onPreview?.(previewHtml(recipe));
  }

  function syncForm(recipe) {
    ui.weightUnit.value = session.weightUnit;
    ui.sizeUnit.value = session.sizeUnit;
    ui.surface.value = session.surfaceType;
    ui.calcMethod.value = session.calcMethod;
    ui.shape.value = session.shape;
    ui.oven.value = session.ovenId || "";
    ui.doughCount.value = String(session.doughCount);
    ui.roundDoughCount.value = String(session.doughCount);
    ui.hydration.value = Number(session.hydrationPct).toFixed(1);
    ui.tf.value = Number(session.thicknessFactor).toFixed(3);
    ui.roundTf.value = Number(session.thicknessFactor).toFixed(3);
    ui.ballWeight.value = String(toDisplayWeight(session.doughBallWeight, session.weightUnit));
    ui.roundBallWeight.value = String(toDisplayWeight(session.doughBallWeight, session.weightUnit));
    ui.diameter.value = String(toDisplayLength(session.diameterIn, session.sizeUnit));
    ui.roundDiameter.value = String(toDisplayLength(session.diameterIn, session.sizeUnit));
    ui.width.value = String(toDisplayLength(session.widthIn, session.sizeUnit));
    ui.roundWidth.value = String(toDisplayLength(session.widthIn, session.sizeUnit));
    ui.length.value = String(toDisplayLength(session.lengthIn, session.sizeUnit));
    ui.roundLength.value = String(toDisplayLength(session.lengthIn, session.sizeUnit));
    ui.duration.value = String(session.fermentation.durationHours);
    ui.roomTemp.value = String(session.fermentation.roomTempF);
    ui.yeastMode.value = session.fermentation.yeastMode;
    ui.manualYeastPct.value = Number(session.fermentation.manualYeastPct).toFixed(2);
    ui.coldHours.value = String(session.fermentation.coldFermentHours);
    ui.doughTemp.value = String(session.fermentation.doughTempF);
    ui.prefermentEnabled.value = String(session.fermentation.prefermentEnabled);
    ui.prefermentType.value = session.fermentation.prefermentType;
    ui.prefermentHydration.value = String(session.fermentation.prefermentHydration);
    ui.prefermentPercent.value = String(session.fermentation.prefermentPercent);
    ui.prefermentHydrationDisplay.value = String(session.fermentation.prefermentHydration);
    ui.prefermentPercentRange.value = String(session.fermentation.prefermentPercent);
    ui.prefermentPercentReadout.textContent = `${Math.round(session.fermentation.prefermentPercent)}%`;
    ui.durationDisplay.value = String(session.fermentation.durationHours);
    ui.roomTempDisplay.value = String(session.fermentation.roomTempF);

    fillOvens(ui.oven, prefs, session.ovenId);
    fillYeastModels(ui.yeastModel, store, session.fermentation.yeastModel);
    fillFavorites(ui.favoriteFlour, prefs, flourById);

    const showRect = session.shape === "rectangular";
    const showRoundFoundation = true;
    const weightUnitShort = session.weightUnit === "ounces" ? "oz" : "g";
    ui.roundWrap.classList.toggle("hidden", showRect);
    ui.rectWrap.classList.toggle("hidden", !showRect);
    ui.roundFoundation.classList.toggle("hidden", !showRoundFoundation);
    ui.roundFoundation.classList.toggle("is-square", showRect);
    ui.roundDiameterField.classList.toggle("hidden", showRect);
    ui.roundWidthField.classList.toggle("hidden", !showRect);
    ui.roundLengthField.classList.toggle("hidden", !showRect);
    ui.tfControl.classList.toggle("hidden", session.calcMethod !== "TF");
    ui.ballWeightControl.classList.toggle("hidden", session.calcMethod !== "DBW");
    ui.roundTfWrap.classList.toggle("hidden", session.calcMethod !== "TF");
    ui.roundBallWeightWrap.classList.toggle("hidden", session.calcMethod !== "DBW");
    ui.manualYeastWrap.classList.toggle("hidden", session.fermentation.yeastMode !== "manual");
    ui.prefermentFields.classList.toggle("hidden", !session.workflow.preferments || !session.fermentation.prefermentEnabled);
    ui.advancedPanel.classList.toggle("hidden", !foundationAdvancedOpen);
    ui.fermentAdvancedPanel.classList.toggle("hidden", !fermentationAdvancedOpen);
    ui.advancedToggle.setAttribute("aria-expanded", String(foundationAdvancedOpen));
    ui.fermentAdvancedToggle.setAttribute("aria-expanded", String(fermentationAdvancedOpen));
    ui.advancedToggle.textContent = foundationAdvancedOpen ? "Hide Advanced Settings" : "Advanced Settings";
    ui.fermentAdvancedToggle.textContent = fermentationAdvancedOpen ? "Hide Advanced Fermentation" : "Advanced Fermentation";

    const sizeUnitShort = session.sizeUnit === "centimeters" ? "cm" : "in";
    ui.ballWeightLabel.textContent = `Dough Weight (${weightUnitShort})`;
    ui.diameterLabel.textContent = `Diameter (${sizeUnitShort})`;
    ui.widthLabel.textContent = `Pan Width (${sizeUnitShort})`;
    ui.lengthLabel.textContent = `Pan Length (${sizeUnitShort})`;
    ui.roundDiameterLabel.textContent = "Diameter";
    ui.roundDiameterUnit.textContent = sizeUnitShort;
    ui.roundWidthLabel.textContent = "Width";
    ui.roundWidthUnit.textContent = sizeUnitShort;
    ui.roundLengthLabel.textContent = "Length";
    ui.roundLengthUnit.textContent = sizeUnitShort;
    ui.roundDriverLabel.textContent = session.calcMethod === "TF" ? "Thickness Factor" : "Dough Weight";
    ui.roundDriverUnit.textContent = weightUnitShort;
    ui.roundTotalUnit.textContent = weightUnitShort;
    ui.totalWeightDisplay.value = displayNumber(toDisplayWeight(recipe.totals.totalDoughG, session.weightUnit), session.weightUnit === "ounces" ? 2 : 0);
    ui.geometryMeta.textContent = session.templateId
      ? `${templateName(session.templateId)} defaults loaded. Shape and oven can still be overridden.`
      : `Using ${session.shape === "round" ? "round" : "rectangular"} geometry with ${session.surfaceType}.`;
    ui.formulaMeta.textContent = session.calcMethod === "TF"
      ? "Thickness Factor is driving dough mass."
      : "Dough Ball Weight is driving dough mass.";
    ui.foundationMeta.textContent = `${recipe.labels.size} | ${recipe.labels.totalDough}`;
    ui.flourMeta.textContent = `${session.flourBlend.length} flour${session.flourBlend.length === 1 ? "" : "s"} in blend`;
    ui.formulaStepMeta.textContent = formulaMetaText(session);
    ui.fermentationMeta.textContent = `${session.fermentation.yeastMode === "manual" ? "Manual yeast" : "Auto yeast"} | ${session.fermentation.durationHours}h at ${session.fermentation.roomTempF}F`;
    ui.prefermentSliderWrap.classList.toggle("hidden", !session.fermentation.prefermentEnabled);
    ui.prefermentHydrationCard.classList.toggle("hidden", !session.fermentation.prefermentEnabled);
    ui.optionalMeta.textContent = optionalMetaText(session);
    ui.analysisMeta.textContent = session.analysisEnabled && session.workflow.doughAnalysis ? "Advisory signals active" : "Analysis disabled in Preferences";
    ui.previewMeta.textContent = recipe.complete ? "Live preview updating" : "Complete the calculator inputs to stabilize the preview";
  }

  function renderAccordion() {
    STEP_ORDER.forEach((step) => {
      const node = stepNodes[step];
      if (!node) return;
      node.classList.toggle("is-collapsed", openStep !== step);
      const button = node.querySelector("[data-step-open]");
      if (button) button.textContent = openStep === step ? "Current" : "Open";
    });
  }

  function renderFoundation(recipe) {
    setStyleButtonState(ui.styleRound, session.shape === "round");
    setStyleButtonState(ui.styleSquare, session.shape === "rectangular");
    setStyleButtonState(ui.stylePan, session.surfaceType === "pan");
    ui.foundationSummary.classList.add("hidden");
    ui.foundationSummary.innerHTML = "";
  }

  function setStyleButtonState(button, isActive) {
    if (!button) return;
    button.classList.toggle("primary", isActive);
    button.classList.toggle("ghost", !isActive);
  }

  function applyStylePreset(style) {
    if (style === "round") {
      session.shape = "round";
      if (!Number.isFinite(Number(session.diameterIn)) || Number(session.diameterIn) <= 0) {
        session.diameterIn = 14;
      }
      return;
    }

    session.shape = "rectangular";

    const fallbackSize = Number(session.widthIn) > 0 ? Number(session.widthIn) : Number(session.diameterIn) > 0 ? Number(session.diameterIn) : 12;
    if (!Number.isFinite(Number(session.widthIn)) || Number(session.widthIn) <= 0) session.widthIn = fallbackSize;
    if (!Number.isFinite(Number(session.lengthIn)) || Number(session.lengthIn) <= 0) session.lengthIn = fallbackSize;
  }

  function renderBlend(recipe) {
    const rows = session.flourBlend.map((row) => ({ ...row, flour: flourById.get(row.id) || row.flour || null }));
    ui.blendMeta.textContent = rows.length ? `${rows.length} flour${rows.length === 1 ? "" : "s"} selected` : "None selected yet.";
    ui.addFavoriteFlour.textContent = rows.length ? "Add Flour to Blend" : "Add Flour";
    ui.blendEditor.innerHTML = rows.length
      ? rows.map((row) => `
          <div class="wo-blend-row wo-blend-row-minimal">
            <div class="wo-blend-copy">
              <div class="wo-blend-name">${esc(flourName(row.flour, row.id))}</div>
              <div class="muted">Protein ${esc(blendProtein(row.flour))}</div>
            </div>
            <div class="wo-blend-controls wo-blend-controls-minimal">
              <input class="input wo-pct-input" id="woBlendPct_${esc(row.id)}" type="number" min="0" max="100" step="1" value="${row.pct}" data-pct="${esc(row.id)}" data-scrub-target="woBlendPct_${esc(row.id)}" data-scrub-step="1" title="Drag left or right to adjust" />
              <span class="muted">%</span>
              <button class="btn ghost sm wo-blend-delete" type="button" data-remove="${esc(row.id)}" aria-label="Remove flour">&times;</button>
            </div>
          </div>
        `).join("")
      : `
          <div class="wo-blend-row wo-blend-row-minimal wo-blend-row-placeholder">
            <div class="wo-blend-copy">
              <div class="wo-blend-name">No Flour Selected</div>
              <div class="muted">Protein 0.0%</div>
            </div>
            <div class="wo-blend-controls wo-blend-controls-minimal">
              <input class="input wo-pct-input" type="number" value="100" disabled />
              <span class="muted">%</span>
              <button class="btn ghost sm wo-blend-delete" type="button" disabled aria-label="Remove flour">&times;</button>
            </div>
          </div>
        `;

    ui.blendEditor.querySelectorAll("[data-pct]").forEach((input) => bind(input, "input", () => {
      const id = input.getAttribute("data-pct");
      session.flourBlend = rebalanceBlend(session.flourBlend, id, Number(input.value || 0));
      refresh();
    }));
    bindScrubbers(ui.blendEditor);

    ui.blendEditor.querySelectorAll("[data-remove]").forEach((button) => bind(button, "click", () => {
      const id = button.getAttribute("data-remove");
      session.flourBlend = session.flourBlend.filter((row) => row.id !== id);
      if (session.flourBlend.length === 1) session.flourBlend = [{ ...session.flourBlend[0], pct: 100 }];
      refresh();
    }));

    const protein = recipe.blendStats.proteinPct != null ? `${recipe.blendStats.proteinPct}%` : "0.0%";
    const wRating = blendWRating(rows) || "W0";
    ui.blendStats.innerHTML = `
      <div class="wo-stat-card"><div class="muted">Combined Protein</div><strong>${esc(protein)}</strong></div>
      <div class="wo-stat-card"><div class="muted">Combined W Rating</div><strong>${esc(wRating)}</strong></div>
    `;
  }

  function renderFormula() {
    const rows = formulaRows(session, prefs);
    const customRows = rows.filter((row) => row.kind === "extra");
    const noteParts = ["All values here remain baker's percentages and now feed the live formula sheet."];
    if (session.fermentation.yeastMode === "manual") noteParts.push(`Manual yeast is active at ${Number(session.fermentation.manualYeastPct).toFixed(2)}%.`);
    if (Number(session.formula.saltPct) !== BASE_SALT_PCT || Number(session.formula.oilPct) > 0 || customRows.length) {
      noteParts.push("Optional rows are folded directly into the recipe math and preview tables.");
    }
    ui.formulaNote.innerHTML = `<div class="muted">${esc(noteParts.join(" "))}</div>`;
    ui.formulaList.innerHTML = rows.map((row) => formulaRowHtml(row)).join("");
    bindScrubbers(ui.formulaList);

    ui.formulaList.querySelectorAll("[data-formula-key]").forEach((input) => bind(input, "input", () => {
      const key = input.getAttribute("data-formula-key");
      session.formula[key] = Number(input.value || 0);
      refresh();
    }));

    ui.formulaList.querySelectorAll("[data-extra-id]").forEach((input) => bind(input, "input", () => {
      const id = input.getAttribute("data-extra-id");
      session.formula.extras = session.formula.extras.map((row) => row.id === id ? { ...row, pct: Number(input.value || 0) } : row);
      refresh();
    }));

    ui.formulaList.querySelectorAll("[data-remove-extra]").forEach((button) => bind(button, "click", () => {
      const id = button.getAttribute("data-remove-extra");
      session.formula.extras = session.formula.extras.filter((row) => row.id !== id);
      refresh();
    }));
  }

  function renderFermentation() {
    ui.manualYeastWrap.classList.toggle("hidden", session.fermentation.yeastMode !== "manual");
    ui.prefermentFields.classList.toggle("hidden", !session.workflow.preferments || !session.fermentation.prefermentEnabled);
    const method = session.fermentation.prefermentEnabled ? session.fermentation.prefermentType : "direct";
    [ui.methodDirect, ui.methodBiga, ui.methodPoolish, ui.methodSourdough].forEach((button) => button?.classList.remove("is-active"));
    if (method === "direct") ui.methodDirect.classList.add("is-active");
    if (method === "biga") ui.methodBiga.classList.add("is-active");
    if (method === "poolish") ui.methodPoolish.classList.add("is-active");
    if (method === "sourdough") ui.methodSourdough.classList.add("is-active");
    ui.fermentBadge.textContent = session.fermentation.prefermentEnabled ? "✓" : "2";
    ui.fermentStatus.textContent = session.fermentation.prefermentEnabled || session.fermentation.durationHours ? "Complete" : "In Progress";
  }

  function renderOptional() {
    const blocks = [];
    if (session.workflow.toppings) {
      blocks.push(`
        <div class="field">
          <div class="fieldtop"><div class="fieldlbl"><span>Toppings</span></div><div class="muted">Planning notes for the topping system.</div></div>
          <textarea class="input wo-textarea" id="woToppingsNotes" placeholder="Add topping notes...">${esc(session.optional.toppingsNotes || "")}</textarea>
        </div>
      `);
    }
    if (session.workflow.sauce) {
      blocks.push(`
        <div class="field">
          <div class="fieldtop"><div class="fieldlbl"><span>Sauce</span></div><div class="muted">Reserved for sauce builder inputs.</div></div>
          <textarea class="input wo-textarea" id="woSauceNotes" placeholder="Add sauce notes...">${esc(session.optional.sauceNotes || "")}</textarea>
        </div>
      `);
    }
    if (!blocks.length) {
      blocks.push(`<div class="item"><h4>No optional modules enabled</h4><p class="muted">Sauce, toppings, and future add-ons remain hidden until they are enabled in Preferences.</p></div>`);
    }
    blocks.push(`<div class="wo-step-actions"><button class="btn primary" id="woNextAnalysis" type="button">Continue to Dough Analysis</button></div>`);
    ui.optionalBody.innerHTML = blocks.join("");

    root.querySelector("#woToppingsNotes")?.addEventListener("input", (event) => {
      session.optional.toppingsNotes = event.target.value || "";
      refresh();
    });
    root.querySelector("#woSauceNotes")?.addEventListener("input", (event) => {
      session.optional.sauceNotes = event.target.value || "";
      refresh();
    });
    root.querySelector("#woNextAnalysis")?.addEventListener("click", () => goToStep("analysis"));
  }

  function renderAnalysis(recipe) {
    if (!session.analysisEnabled || !session.workflow.doughAnalysis) {
      ui.analysisBody.innerHTML = `
        <div class="item">
          <h4>Analysis Disabled</h4>
          <p class="muted">Enable Dough Analysis in Preferences or Quick Setup to show advisory signals here.</p>
        </div>
        <div class="wo-step-actions"><button class="btn primary" id="woNextPreview" type="button">Continue to Live Preview</button></div>
      `;
      root.querySelector("#woNextPreview")?.addEventListener("click", () => goToStep("preview"));
      return;
    }

    ui.analysisBody.innerHTML = `
      <div class="wo-analysis-list">
        ${analysisLine("Hydration vs Flour Strength", recipe.analysis.hydration.signal, recipe.analysis.hydration.text)}
        ${analysisLine("Fermentation Duration", recipe.analysis.fermentation.signal, recipe.analysis.fermentation.text)}
        ${analysisLine("Oven Compatibility", recipe.analysis.oven.signal, recipe.analysis.oven.text)}
      </div>
      <div class="item" style="margin-top:12px;">
        <h4>Suggestions</h4>
        <ul class="wo-list">${recipe.analysis.suggestions.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
      </div>
      <div class="wo-step-actions"><button class="btn primary" id="woNextPreview" type="button">Continue to Live Preview</button></div>
    `;

    root.querySelector("#woNextPreview")?.addEventListener("click", () => goToStep("preview"));
  }

  function renderPreviewStep(recipe) {
    const formulaSummary = formulaRows(session, prefs)
      .filter((row) => row.kind === "extra" || row.key !== "saltPct" || Number(row.pct) !== BASE_SALT_PCT || row.key === "oilPct")
      .filter((row) => row.kind === "extra" || Number(row.pct) > 0 || row.key === "saltPct")
      .map((row) => `${row.name} ${Number(row.pct).toFixed(2)}%`)
      .join(", ");

    ui.previewSummary.innerHTML = `
      <h4>Live Preview Status</h4>
      <p class="muted">The right panel now renders a bakery-style formula sheet with aligned tables, notes, export, and QR tools.</p>
      <div class="wo-summary-grid">
        <div><span class="muted">Total Dough</span><strong>${esc(recipe.labels.totalDough)}</strong></div>
        <div><span class="muted">Ball Weight</span><strong>${esc(recipe.labels.ballWeight)}</strong></div>
        <div><span class="muted">Total Flour</span><strong>${esc(recipe.labels.totalFlour)}</strong></div>
        <div><span class="muted">Preview</span><strong>${recipe.complete ? "Ready" : "Incomplete"}</strong></div>
      </div>
      <p class="muted" style="margin-top:12px;">${esc(formulaSummary || "Core flour, water, salt, and yeast are ready for review.")}</p>
    `;
  }

  function previewHtml(recipe) {
    return `
      <div class="wo-preview-actions">
        <button class="btn primary" type="button" data-preview-action="copy">Copy Recipe</button>
        <button class="btn ghost" type="button" data-preview-action="download">Export File</button>
        <button class="btn ghost" type="button" data-preview-action="qr">Generate QR</button>
      </div>
      <article class="wo-formula-sheet" style="margin-top:12px;">
        <div class="wo-sheet-kicker">MASTER FORMULA</div>
        <h3 class="wo-sheet-title">${esc(recipe.masterFormulaTitle)}</h3>
        <div class="wo-sheet-meta">
          ${previewStat("Total Dough", recipe.labels.totalDough)}
          ${previewStat("Dough Balls", String(recipe.session.doughCount))}
          ${previewStat("Ball Weight", recipe.labels.ballWeight)}
          ${previewStat("Total Flour", recipe.labels.totalFlour)}
        </div>
        ${recipe.preferment ? `
          <section class="wo-sheet-section">
            <div class="wo-sheet-sectionhead">PREFERMENT (${esc(recipe.preferment.name)})</div>
            ${previewTable(recipe.tables.preferment, recipe.session.weightUnit)}
            <div class="wo-sheet-total">Preferment Total: ${esc(formatWeight(recipe.preferment.totalG, recipe.session.weightUnit))}</div>
          </section>
        ` : ""}
        <section class="wo-sheet-section">
          <div class="wo-sheet-sectionhead">FINAL DOUGH</div>
          ${previewTable(recipe.tables.finalDough, recipe.session.weightUnit)}
        </section>
        <div class="wo-sheet-divider"></div>
        <section class="wo-sheet-section">
          <div class="wo-sheet-sectionhead">NET INGREDIENTS</div>
          ${previewTable(recipe.tables.netIngredients, recipe.session.weightUnit)}
        </section>
        <div class="wo-sheet-divider"></div>
        <section class="wo-sheet-section">
          <label class="lbl" for="woPreviewNotes">Notes</label>
          <textarea class="input wo-preview-notes" id="woPreviewNotes" data-preview-notes placeholder="Add baking temperature, fermentation schedule, or handling notes...">${esc(recipe.session.notes || "")}</textarea>
        </section>
        ${recipe.warnings.length ? `
          <section class="wo-sheet-section">
            <div class="wo-sheet-sectionhead">WARNINGS</div>
            <ul class="wo-list">${recipe.warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul>
          </section>
        ` : ""}
      </article>
    `;
  }

  function previewStat(label, value) {
    return `<div class="wo-sheet-meta-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function previewTable(rows, weightUnit) {
    return `
      <table class="wo-formula-table">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Weight</th>
            <th>Baker's %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${esc(row.name)}</td>
              <td>${esc(formatWeight(row.weightG, weightUnit))}</td>
              <td>${esc(formatPct(row.pct))}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function formatPct(value) {
    const num = Number(value || 0);
    if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num));
    if (Math.abs(num * 10 - Math.round(num * 10)) < 0.001) return num.toFixed(1);
    return num.toFixed(2);
  }

  function displayNumber(value, digits = 0) {
    const num = Number(value || 0);
    if (digits <= 0) return String(Math.round(num));
    return num.toFixed(digits);
  }

  function openTemplates() {
    if (!TEMPLATE_LIBRARY.length) {
      window.PDT?.openSidePanel?.({
        title: "Recipe Templates",
        bodyEl: wrap(`<div class="item"><p class="muted" style="line-height:1.5;">${TEMPLATE_LOADING_MESSAGE}</p></div>`)
      });
      return;
    }

    window.PDT?.openSideRoute?.("templates", "Recipe Templates");
  }

  function openHelp() {
    const body = document.createElement("div");
    body.innerHTML = `
      <div class="item">
        <h4>Calculator Help</h4>
        <p class="muted" style="line-height:1.5;">The calculator moves in a guided order: Foundation, Fermentation, Flour, Dough Formula, Optional Modules, Dough Analysis, and Live Preview. The right panel acts as a temporary workspace and returns to the recipe when you're done.</p>
      </div>
      <div class="item" style="margin-top:12px;">
        <h4>Open A Reference</h4>
        <div class="wo-inline-actions" style="margin-top:10px;">
          <button class="btn" type="button" data-open-side-route="guides">Guides</button>
          <button class="btn ghost" type="button" data-open-side-route="troubleshooting">Troubleshooter</button>
          <button class="btn ghost" type="button" data-open-side-route="glossary">Glossary</button>
        </div>
      </div>
    `;
    body.querySelectorAll("[data-open-side-route]").forEach((button) => bind(button, "click", () => {
      window.PDT?.openSideRoute?.(button.getAttribute("data-open-side-route"));
    }));
    window.PDT?.openSidePanel?.({ title: "Calculator Help", bodyEl: body });
  }

  function openQuickSetup() {
    const body = document.createElement("div");
    body.innerHTML = `
      <div class="wo-modal-grid">
        <div class="muted">Quick Setup updates the same defaults managed in Preferences, then starts a fresh calculator session from those settings.</div>
        <div class="wo-grid2">
          <div><label class="lbl">Weight Units</label><select class="input" id="qsWeight"><option value="grams">grams</option><option value="ounces">ounces</option></select></div>
          <div><label class="lbl">Size Units</label><select class="input" id="qsSize"><option value="inches">inches</option><option value="centimeters">centimeters</option></select></div>
          <div><label class="lbl">Calculation System</label><select class="input" id="qsCalc"><option value="DBW">Dough Ball Weight (DBW)</option><option value="TF">Thickness Factor (TF)</option></select></div>
          <div><label class="lbl">Startup Workflow</label><select class="input" id="qsStartup"><option value="blank">Blank Calculator</option>${TEMPLATE_LIBRARY.map((template) => `<option value="${esc(template.id)}">${esc(template.name)}</option>`).join("")}</select></div>
          <div><label class="lbl">Default Dough Ball Weight</label><input class="input" id="qsBallWeight" type="number" min="50" max="2000" step="1" /></div>
          <div><label class="lbl">Default Thickness Factor</label><input class="input" id="qsThicknessFactor" type="number" min="0.05" max="0.2" step="0.001" /></div>
          <div><label class="lbl">Fermentation Model</label><select class="input" id="qsYeastModel"></select></div>
        </div>
      </div>
    `;

    showModal({
      title: "Quick Setup",
      bodyEl: body,
      actions: [{
        label: "Save Defaults",
        primary: true,
        onClick: ({ close }) => {
          const nextPrefs = normalizePrefs({
            ...prefs,
            general: {
              ...prefs.general,
              weightUnit: body.querySelector("#qsWeight").value,
              sizeUnit: body.querySelector("#qsSize").value,
              calculationMethod: body.querySelector("#qsCalc").value,
              startupWorkflow: body.querySelector("#qsStartup").value,
              defaultDoughBallWeight: Number(body.querySelector("#qsBallWeight").value || prefs.general.defaultDoughBallWeight),
              defaultThicknessFactor: Number(body.querySelector("#qsThicknessFactor").value || prefs.general.defaultThicknessFactor),
              defaultFermentationModelId: body.querySelector("#qsYeastModel").value || prefs.general.defaultFermentationModelId
            }
          });

          prefs = nextPrefs;
          savePrefs(nextPrefs);
          store.set("prefs", nextPrefs);
          session = createSessionFromPrefs(nextPrefs);
          foundationAdvancedOpen = false;
          fermentationAdvancedOpen = false;
          openStep = "foundation";
          refresh();
          close();
        }
      }]
    });

    body.querySelector("#qsWeight").value = prefs.general.weightUnit;
    body.querySelector("#qsSize").value = prefs.general.sizeUnit;
    body.querySelector("#qsCalc").value = prefs.general.calculationMethod;
    body.querySelector("#qsStartup").value = prefs.general.startupWorkflow || "blank";
    body.querySelector("#qsBallWeight").value = String(prefs.general.defaultDoughBallWeight || 280);
    body.querySelector("#qsThicknessFactor").value = String(prefs.general.defaultThicknessFactor || 0.1);
    fillYeastModels(body.querySelector("#qsYeastModel"), store, prefs.general.defaultFermentationModelId);
  }

  function openIngredientPicker() {
    const allIngredients = getAllIngredients(prefs)
      .filter((ingredient) => ingredient.selected)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!allIngredients.length) {
      showModal({
        title: "Optional Ingredients",
        bodyEl: wrap('<div class="muted" style="line-height:1.5;">Select optional ingredients in Preferences to make them available here.</div>')
      });
      return;
    }

    const body = document.createElement("div");
    body.innerHTML = `<div class="wo-modal-grid"><input class="input" id="woIngredientSearch" placeholder="Search optional ingredients" /><div id="woIngredientList" class="wo-library-list"></div></div>`;

    const listEl = body.querySelector("#woIngredientList");
    const searchEl = body.querySelector("#woIngredientSearch");
    let modal = null;

    function renderList() {
      const query = String(searchEl.value || "").trim().toLowerCase();
      const rows = allIngredients.filter((ingredient) => !query || `${ingredient.name} ${ingredient.category}`.toLowerCase().includes(query));
      listEl.innerHTML = rows.length
        ? rows.map((ingredient) => `
            <div class="wo-library-row">
              <div>
                <div class="wo-library-title">${esc(ingredient.name)}</div>
                <div class="muted">${esc(`${ingredient.category} | Default ${Number(ingredient.defaultPct || 0).toFixed(2)}%`)}</div>
              </div>
              <div class="wo-library-actions">
                <button class="btn ghost sm" type="button" data-add-ingredient="${esc(ingredient.id)}">Add</button>
              </div>
            </div>
          `).join("")
        : `<div class="muted">No ingredients match your search.</div>`;

      listEl.querySelectorAll("[data-add-ingredient]").forEach((button) => bind(button, "click", () => {
        const ingredient = allIngredients.find((item) => item.id === button.getAttribute("data-add-ingredient"));
        if (!ingredient) return;
        if (session.formula.extras.some((row) => row.id === ingredient.id)) {
          modal?.close();
          goToStep("formula");
          return;
        }
        session.formula.extras = [...session.formula.extras, {
          id: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          pct: Number(ingredient.defaultPct || 0),
          builtIn: Boolean(ingredient.builtIn)
        }];
        refresh();
        goToStep("formula");
        modal?.close();
      }));
    }

    bind(searchEl, "input", renderList);
    renderList();
    modal = showModal({ title: "Optional Ingredients", bodyEl: body });
  }

  async function hydrateFlours() {
    try {
      flourCatalog = await loadFloursForBrowser(store);
      flourById = new Map(flourCatalog.map((flour) => [flour.id, flour]));
    } catch (error) {
      console.warn(error);
      flourCatalog = [];
      flourById = new Map();
    }
    refresh();
  }

  function goToStep(step) {
    openStep = STEP_ORDER.includes(step) ? step : "foundation";
    renderAccordion();
    scrollToStep(stepNodes[openStep]);
  }

  bind(ui.styleRound, "click", () => {
    applyStylePreset("round");
    refresh();
  });
  bind(ui.styleSquare, "click", () => {
    applyStylePreset("square");
    refresh();
  });
  bind(ui.stylePan, "click", () => {
    session.surfaceType = session.surfaceType === "pan" ? "deck" : "pan";
    refresh();
  });
  bind(ui.recipe, "click", openTemplates);
  bind(ui.configure, "click", () => window.PDT?.openSideRoute?.("preferences", "Preferences"));
  bind(ui.importBtn, "click", () => ui.importFile.click());
  bind(ui.custom, "click", () => {
    session = createBlankSessionFromPrefs(prefs);
    foundationAdvancedOpen = false;
    fermentationAdvancedOpen = false;
    openStep = "foundation";
    refresh();
  });
  bind(ui.help, "click", openHelp);
  bind(ui.quick, "click", openQuickSetup);
  bind(ui.advancedToggle, "click", () => {
    foundationAdvancedOpen = !foundationAdvancedOpen;
    refresh();
  });
  bind(ui.fermentAdvancedToggle, "click", () => {
    fermentationAdvancedOpen = !fermentationAdvancedOpen;
    refresh();
  });
  bind(ui.nextFlour, "click", () => goToStep("fermentation"));
  bind(ui.nextFormula, "click", () => goToStep("formula"));
  bind(ui.nextFermentation, "click", () => goToStep("optional"));
  bind(ui.nextOptional, "click", () => goToStep("flour"));
  bind(ui.previewKB, "click", () => onOpenKB?.());
  bind(ui.addIngredient, "click", openIngredientPicker);

  bind(ui.methodDirect, "click", () => {
    session.fermentation.prefermentEnabled = false;
    refresh();
  });
  bind(ui.methodBiga, "click", () => {
    session.fermentation.prefermentEnabled = true;
    session.fermentation.prefermentType = "biga";
    refresh();
  });
  bind(ui.methodPoolish, "click", () => {
    session.fermentation.prefermentEnabled = true;
    session.fermentation.prefermentType = "poolish";
    refresh();
  });
  bind(ui.methodSourdough, "click", () => {
    session.fermentation.prefermentEnabled = true;
    session.fermentation.prefermentType = "sourdough";
    refresh();
  });

  root.querySelectorAll("[data-step-open]").forEach((button) => bind(button, "click", () => goToStep(button.getAttribute("data-step-open"))));
  root.querySelectorAll(".wo-stephead").forEach((head) => bind(head, "click", (event) => {
    if (event.target.closest("button, input, select, textarea, label")) return;
    const step = head.closest("[data-step-root]")?.getAttribute("data-step-root");
    if (step) goToStep(step);
  }));

  bind(ui.importFile, "change", async () => {
    const file = ui.importFile.files?.[0];
    if (!file) return;
    try {
      session = normalizeCalculatorSession(importRecipePayload(await file.text(), prefs), prefs);
      foundationAdvancedOpen = false;
      fermentationAdvancedOpen = false;
      openStep = "foundation";
      refresh();
    } catch (error) {
      window.alert(error.message || "Could not import recipe file.");
    } finally {
      ui.importFile.value = "";
    }
  });

  bind(ui.weightUnit, "change", () => { session.weightUnit = ui.weightUnit.value; refresh(); });
  bind(ui.sizeUnit, "change", () => { session.sizeUnit = ui.sizeUnit.value; refresh(); });
  bind(ui.surface, "change", () => { session.surfaceType = ui.surface.value; refresh(); });
  bind(ui.oven, "change", () => { session.ovenId = ui.oven.value; refresh(); });
  bind(ui.calcMethod, "change", () => { session.calcMethod = ui.calcMethod.value; refresh(); });
  bind(ui.shape, "change", () => { session.shape = ui.shape.value; refresh(); });
  bind(ui.diameter, "input", () => { session.diameterIn = fromDisplayLength(ui.diameter.value, session.sizeUnit); refresh(); });
  bind(ui.roundDiameter, "input", () => { session.diameterIn = fromDisplayLength(ui.roundDiameter.value, session.sizeUnit); refresh(); });
  bind(ui.width, "input", () => { session.widthIn = fromDisplayLength(ui.width.value, session.sizeUnit); refresh(); });
  bind(ui.roundWidth, "input", () => { session.widthIn = fromDisplayLength(ui.roundWidth.value, session.sizeUnit); refresh(); });
  bind(ui.length, "input", () => { session.lengthIn = fromDisplayLength(ui.length.value, session.sizeUnit); refresh(); });
  bind(ui.roundLength, "input", () => { session.lengthIn = fromDisplayLength(ui.roundLength.value, session.sizeUnit); refresh(); });
  bind(ui.doughCount, "input", () => { session.doughCount = Number(ui.doughCount.value || 1); refresh(); });
  bind(ui.roundDoughCount, "input", () => { session.doughCount = Number(ui.roundDoughCount.value || 1); refresh(); });
  bind(ui.hydration, "input", () => { session.hydrationPct = Number(ui.hydration.value || 62); refresh(); });
  bind(ui.tf, "input", () => { session.thicknessFactor = Number(ui.tf.value || 0.1); refresh(); });
  bind(ui.roundTf, "input", () => { session.thicknessFactor = Number(ui.roundTf.value || 0.1); refresh(); });
  bind(ui.ballWeight, "input", () => { session.doughBallWeight = fromDisplayWeight(ui.ballWeight.value, session.weightUnit); refresh(); });
  bind(ui.roundBallWeight, "input", () => { session.doughBallWeight = fromDisplayWeight(ui.roundBallWeight.value, session.weightUnit); refresh(); });
  bind(ui.addFavoriteFlour, "click", () => {
    const body = document.createElement("div");
    body.innerHTML = `
      <div class="wo-modal-grid">
        <input class="input" id="woSideFlourSearch" placeholder="Search favorite flours" />
        <div id="woSideFlourList" class="wo-library-list"></div>
      </div>
    `;
    const searchEl = body.querySelector("#woSideFlourSearch");
    const listEl = body.querySelector("#woSideFlourList");
    const favoriteIds = new Set(getFavoriteFlourIds(prefs));

    const renderList = () => {
      const selectedIds = new Set(session.flourBlend.map((row) => row.id));
      const query = String(searchEl.value || "").trim().toLowerCase();
      const rows = flourCatalog
        .filter((flour) => favoriteIds.has(flour.id))
        .filter((flour) => !query || `${flour.name} ${flour.type || ""}`.toLowerCase().includes(query));
      listEl.innerHTML = rows.length
        ? rows.map((flour) => `
            <div class="wo-library-row">
              <div>
                <div class="wo-library-title">${esc(flour.name)}</div>
                <div class="muted">${esc(flour.type || "Flour")}</div>
              </div>
              <div class="wo-library-actions">
                <button class="btn ${selectedIds.has(flour.id) ? "ghost" : ""} sm" type="button" data-side-flour="${esc(flour.id)}">
                  ${selectedIds.has(flour.id) ? "Remove" : "Add"}
                </button>
              </div>
            </div>
          `).join("")
        : `<div class="muted">No flours match your search.</div>`;

      listEl.querySelectorAll("[data-side-flour]").forEach((button) => bind(button, "click", () => {
        const id = button.getAttribute("data-side-flour");
        if (!id) return;
        if (selectedIds.has(id)) {
          session.flourBlend = session.flourBlend.filter((row) => row.id !== id);
        } else {
          const next = [...session.flourBlend, { id, pct: 0 }];
          session.flourBlend = evenSplit(next);
        }
        refresh();
        renderList();
      }));
    };

    bind(searchEl, "input", renderList);
    renderList();
    window.PDT?.openSidePanel?.({ title: session.flourBlend.length ? "Add Flour to Blend" : "Add Flour", bodyEl: body });
  });
  bind(ui.evenSplitBlend, "click", () => { session.flourBlend = evenSplit(session.flourBlend); refresh(); });
  bind(ui.clearBlend, "click", () => { session.flourBlend = []; refresh(); });

  bind(ui.duration, "input", () => { session.fermentation.durationHours = Number(ui.duration.value || 24); refresh(); });
  bind(ui.durationDisplay, "input", () => { session.fermentation.durationHours = Number(ui.durationDisplay.value || 24); refresh(); });
  bind(ui.roomTemp, "input", () => { session.fermentation.roomTempF = Number(ui.roomTemp.value || 70); refresh(); });
  bind(ui.roomTempDisplay, "input", () => { session.fermentation.roomTempF = Number(ui.roomTempDisplay.value || 70); refresh(); });
  bind(ui.yeastModel, "change", () => { session.fermentation.yeastModel = ui.yeastModel.value; refresh(); });
  bind(ui.yeastMode, "change", () => { session.fermentation.yeastMode = ui.yeastMode.value; refresh(); });
  bind(ui.manualYeastPct, "input", () => { session.fermentation.manualYeastPct = Number(ui.manualYeastPct.value || 0); refresh(); });
  bind(ui.coldHours, "input", () => { session.fermentation.coldFermentHours = Number(ui.coldHours.value || 0); refresh(); });
  bind(ui.doughTemp, "input", () => { session.fermentation.doughTempF = Number(ui.doughTemp.value || 70); refresh(); });
  bind(ui.prefermentEnabled, "change", () => { session.fermentation.prefermentEnabled = ui.prefermentEnabled.value === "true"; refresh(); });
  bind(ui.prefermentType, "change", () => { session.fermentation.prefermentType = ui.prefermentType.value; refresh(); });
  bind(ui.prefermentHydration, "input", () => { session.fermentation.prefermentHydration = Number(ui.prefermentHydration.value || 100); refresh(); });
  bind(ui.prefermentHydrationDisplay, "input", () => { session.fermentation.prefermentHydration = Number(ui.prefermentHydrationDisplay.value || 100); refresh(); });
  bind(ui.prefermentPercent, "input", () => { session.fermentation.prefermentPercent = Number(ui.prefermentPercent.value || 20); refresh(); });
  bind(ui.prefermentPercentRange, "input", () => { session.fermentation.prefermentPercent = Number(ui.prefermentPercentRange.value || 20); refresh(); });

  bindScrubbers(root);
  bindSteppers(root);
  refresh();
  hydrateFlours();

  if (store.get("openQuickSetup", false)) {
    store.del?.("openQuickSetup");
    setTimeout(() => openQuickSetup(), 0);
  }

  return root;
}

function createBlankSessionFromPrefs(prefs) {
  const base = createRecipeSession(prefs);
  base.shape = prefs?.general?.defaultShape === "rectangular" ? "rectangular" : "round";
  base.surfaceType = prefs?.general?.defaultSurfaceType === "pan" ? "pan" : "deck";
  base.templateId = null;
  base.startMode = "custom";
  base.fermentation.yeastModel = prefs?.general?.defaultFermentationModelId || base.fermentation.yeastModel;
  return normalizeCalculatorSession(base, prefs);
}

function createSessionFromPrefs(prefs) {
  let base = createBlankSessionFromPrefs(prefs);
  const startupWorkflow = prefs?.general?.startupWorkflow || "blank";
  if (startupWorkflow !== "blank" && TEMPLATE_LIBRARY.some((template) => template.id === startupWorkflow)) {
    base = applyTemplateToSession(base, startupWorkflow, prefs);
  }
  return normalizeCalculatorSession(base, prefs);
}

function normalizeCalculatorSession(input, prefs) {
  return normalizeSession(input, prefs);
}

function formulaRows(session, prefs) {
  const ingredientLookup = new Map(getAllIngredients(prefs).map((ingredient) => [ingredient.id, ingredient]));
  const rows = [
    { kind: "base", key: "saltPct", name: "Salt", subtitle: "Baker's percentage", pct: Number(session.formula.saltPct || 0), step: 0.05 },
    { kind: "base", key: "oilPct", name: "Olive Oil", subtitle: "Baker's percentage", pct: Number(session.formula.oilPct || 0), step: 0.1 }
  ];

  session.formula.extras.forEach((row) => {
    const ingredient = ingredientLookup.get(row.id);
    rows.push({
      kind: "extra",
      id: row.id,
      name: ingredient?.name || row.name || row.id,
      subtitle: ingredient?.category || row.category || "Ingredient",
      pct: Number(row.pct || 0),
      step: 0.1
    });
  });

  return rows;
}

function formulaRowHtml(row) {
  return `
    <div class="wo-formula-row">
      <div class="wo-compact-label"><strong>${esc(row.name)}</strong><span class="muted">${esc(row.subtitle)}</span></div>
      <div class="wo-compact-control">
        <button class="wo-scrub" type="button" data-scrub-target="${esc(formulaInputId(row))}" data-scrub-step="${row.step}" aria-label="Adjust ${esc(row.name)}">drag</button>
        <input class="input wo-compact-input" id="${esc(formulaInputId(row))}" type="number" min="0" max="100" step="${row.step}" value="${Number(row.pct || 0).toFixed(row.step < 0.1 ? 2 : 1)}" ${row.kind === "extra" ? `data-extra-id="${esc(row.id)}"` : `data-formula-key="${esc(row.key)}"`} />
        <span class="wo-compact-suffix">%</span>
        ${row.kind === "extra" ? `<button class="btn ghost sm" type="button" data-remove-extra="${esc(row.id)}">Remove</button>` : ""}
      </div>
    </div>
  `;
}

function formulaInputId(row) {
  return row.kind === "extra" ? `woFormulaExtra_${row.id}` : `woFormula_${row.key}`;
}

function formulaMetaText(session) {
  const extraCount = session.formula.extras.length;
  return `${extraCount} optional ingredient${extraCount === 1 ? "" : "s"} | Salt ${Number(session.formula.saltPct).toFixed(2)}%`;
}

function optionalMetaText(session) {
  const enabled = [];
  if (session.workflow.toppings) enabled.push("Toppings");
  if (session.workflow.sauce) enabled.push("Sauce");
  return enabled.length ? enabled.join(", ") : "No optional modules enabled";
}

function formulaPlanningHtml(session, prefs) {
  const rows = formulaRows(session, prefs)
    .filter((row) => row.kind === "extra" || row.key !== "saltPct" || Number(row.pct) !== BASE_SALT_PCT || Number(session.formula.oilPct) > 0)
    .filter((row) => row.kind === "extra" || Number(row.pct) > 0 || row.key === "saltPct");
  if (!rows.length && session.fermentation.yeastMode !== "manual") return "";

  const notes = ["Formula percentages are stored directly in the calculator session."];
  if (session.fermentation.yeastMode === "manual") notes.push(`Manual yeast is set to ${Number(session.fermentation.manualYeastPct).toFixed(2)}%.`);

  return `
    <div class="item" style="margin-top:12px;">
      <h4>Dough Formula</h4>
      <p class="muted">${esc(notes.join(" "))}</p>
      <ul class="wo-list">${rows.map((row) => `<li>${esc(`${row.name}: ${Number(row.pct).toFixed(2)}%`)}</li>`).join("")}</ul>
    </div>
  `;
}

function fillOvens(selectEl, prefs, selectedId) {
  const list = getAllOvens(prefs).filter((oven) => oven.selected);
  selectEl.innerHTML = `<option value="">No oven selected</option>${list.map((oven) => `<option value="${esc(oven.id)}">${esc(oven.name)}</option>`).join("")}`;
  selectEl.value = list.some((oven) => oven.id === selectedId) ? selectedId : "";
}

function fillTemplateOptions(selectEl, selectedId) {
  selectEl.innerHTML = `<option value="">None</option>${TEMPLATE_LIBRARY.map((template) => `<option value="${esc(template.id)}">${esc(template.name)}</option>`).join("")}`;
  if (selectedId) selectEl.value = selectedId;
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

function bindScrubbers(root) {
  root.querySelectorAll("[data-scrub-target]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-stepper-target]")) return;
      event.preventDefault();
      const targetId = node.getAttribute("data-scrub-target");
      const input = root.querySelector(`#${targetId}`);
      if (!input) return;

      const baseStep = Number(node.getAttribute("data-scrub-step") || input.step || 1) || 1;
      const startX = event.clientX;
      const startValue = Number(input.value || 0);
      const digits = stepDigits(input.step || String(baseStep));
      node.classList.add("is-scrubbing");

      const onMove = (moveEvent) => {
        const precision = moveEvent.ctrlKey || moveEvent.altKey ? 0.1 : moveEvent.shiftKey ? 0.25 : 1;
        const delta = (moveEvent.clientX - startX) / 12;
        const next = clampInputValue(input, startValue + delta * baseStep * precision);
        input.value = Number(next).toFixed(digits);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };

      const onUp = () => {
        node.classList.remove("is-scrubbing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  });
}

function bindSteppers(root) {
  root.querySelectorAll("[data-stepper-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-stepper-target");
      const delta = Number(button.getAttribute("data-stepper-delta") || 0);
      const input = root.querySelector(`#${targetId}`);
      if (!input || Number.isNaN(delta)) return;

      const digits = stepDigits(input.step || String(Math.abs(delta) || 1));
      const next = clampInputValue(input, Number(input.value || 0) + delta);
      input.value = Number(next).toFixed(digits);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

function clampInputValue(input, value) {
  let next = Number(value || 0);
  const min = input.min === "" ? null : Number(input.min);
  const max = input.max === "" ? null : Number(input.max);
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  return next;
}

function stepDigits(step) {
  const text = String(step || "1");
  const pieces = text.split(".");
  return pieces[1] ? pieces[1].length : 0;
}

function evenSplit(rows) {
  const list = (rows || []).filter((row) => row?.id);
  if (!list.length) return [];
  const base = Math.floor(100 / list.length);
  let remainder = 100 - base * list.length;
  return list.map((row) => ({ ...row, pct: base + (remainder-- > 0 ? 1 : 0) }));
}

function rebalanceBlend(rows, targetId, nextPct) {
  const list = (rows || []).filter((row) => row?.id);
  if (!list.length) return [];
  if (list.length === 1) return [{ ...list[0], pct: 100 }];

  const clamped = Math.max(0, Math.min(100, Math.round(Number(nextPct || 0))));
  const others = list.filter((row) => row.id !== targetId);
  const remaining = Math.max(0, 100 - clamped);
  const othersTotal = others.reduce((sum, row) => sum + Number(row.pct || 0), 0);

  let nextRows = list.map((row) => row.id === targetId ? { ...row, pct: clamped } : { ...row });
  if (!others.length) return nextRows;

  if (othersTotal <= 0) {
    const base = Math.floor(remaining / others.length);
    let remainder = remaining - base * others.length;
    nextRows = nextRows.map((row) => row.id === targetId ? row : { ...row, pct: base + (remainder-- > 0 ? 1 : 0) });
  } else {
    let assigned = 0;
    nextRows = nextRows.map((row) => {
      if (row.id === targetId) return row;
      const pct = Math.round((Number(row.pct || 0) / othersTotal) * remaining);
      assigned += pct;
      return { ...row, pct };
    });
    let delta = remaining - assigned;
    for (const row of nextRows) {
      if (!delta || row.id === targetId) continue;
      row.pct += delta > 0 ? 1 : -1;
      delta += delta > 0 ? -1 : 1;
    }
  }

  return nextRows;
}

function blendProtein(flour) {
  if (typeof flour?.proteinPct === "number") return `${Number(flour.proteinPct).toFixed(1)}%`;
  return "--";
}

function blendWRating(rows) {
  if (!rows.length) return "W0";
  const total = rows.reduce((sum, row) => sum + Number(row.pct || 0), 0);
  if (!total) return "W0";
  let weighted = 0;
  let hasW = false;
  rows.forEach((row) => {
    const w = row.flour?.specs?.w?.min ?? row.flour?.wValue ?? null;
    if (w == null) return;
    weighted += Number(w) * (Number(row.pct || 0) / total);
    hasW = true;
  });
  return hasW ? `W${Math.round(weighted)}` : "W0";
}

function analysisLine(label, signal, text) {
  const cls = { green: "g", amber: "a", red: "r", gray: "gray" }[signal] || "gray";
  return `<div class="wo-analysis-row"><div class="wo-analysis-head"><span class="sig ${cls}"></span><strong>${esc(label)}</strong></div><div class="muted">${esc(text)}</div></div>`;
}

function templateName(templateId) {
  return TEMPLATE_LIBRARY.find((template) => template.id === templateId)?.name || "Template";
}

function formatArea(areaIn2, sizeUnit) {
  const value = Number(areaIn2 || 0);
  if (sizeUnit === "centimeters") return `${round(value * 6.4516, 0)} sq cm`;
  return `${round(value, 1)} sq in`;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function round(value, digits = 1) {
  const num = Number(value || 0);
  const factor = Math.pow(10, digits);
  return Math.round(num * factor) / factor;
}

function flourName(flour, fallback) {
  return [flour?.brand, flour?.name].filter(Boolean).join(" ").trim() || fallback || "Flour";
}

function bind(node, event, handler) {
  node?.addEventListener(event, handler);
}

function scrollToStep(node) {
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function map(root, selectors) {
  return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, root.querySelector(selector)]));
}

function wrap(html) {
  const el = document.createElement("div");
  el.innerHTML = html.trim();
  return el.firstElementChild;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
