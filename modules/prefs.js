const PREFS_KEY = "pdt.preferences";
const LEGACY_PREFS_KEY = "pdt_prefs_v1";

const BUILTIN_OVENS = Object.freeze([
  { id: "home_oven", name: "Home Oven", type: "home", minTemperature: 450, maxTemperature: 550 },
  { id: "home_steel", name: "Home Oven + Steel", type: "home", minTemperature: 500, maxTemperature: 650 },
  { id: "breville_pizzaiolo", name: "Breville Pizzaiolo", type: "electric", minTemperature: 650, maxTemperature: 750 },
  { id: "ooni_volt", name: "Ooni Volt", type: "electric", minTemperature: 650, maxTemperature: 850 },
  { id: "ooni_karu_12", name: "Ooni Karu 12", type: "hybrid", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_karu_16", name: "Ooni Karu 16", type: "hybrid", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_koda_12", name: "Ooni Koda 12", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_koda_16", name: "Ooni Koda 16", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_roccbox", name: "Gozney Roccbox", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_arc", name: "Gozney Arc", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_arc_xl", name: "Gozney Arc XL", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_dome", name: "Gozney Dome", type: "hybrid", minTemperature: 700, maxTemperature: 1000 },
  { id: "effeuno_p134h", name: "Effeuno P134H", type: "electric", minTemperature: 650, maxTemperature: 950 },
  { id: "deck_oven", name: "Deck Oven", type: "commercial", minTemperature: 500, maxTemperature: 700 },
  { id: "conveyor_oven", name: "Conveyor Oven", type: "commercial", minTemperature: 450, maxTemperature: 600 },
  { id: "wood_fired_oven", name: "Wood Fired Oven", type: "wood", minTemperature: 700, maxTemperature: 1000 }
]);

const BUILTIN_INGREDIENTS = Object.freeze([
  { id: "honey", name: "Honey", category: "Sweeteners", defaultPct: 2, minPct: 0, maxPct: 8 },
  { id: "sugar", name: "Sugar", category: "Sweeteners", defaultPct: 2, minPct: 0, maxPct: 8 },
  { id: "barley_malt_syrup", name: "Barley Malt Syrup", category: "Sweeteners", defaultPct: 1.5, minPct: 0, maxPct: 6 },
  { id: "milk_powder", name: "Milk Powder", category: "Dairy", defaultPct: 2, minPct: 0, maxPct: 6 },
  { id: "whey", name: "Whey", category: "Dairy", defaultPct: 1, minPct: 0, maxPct: 6 },
  { id: "butter", name: "Butter", category: "Dairy", defaultPct: 2, minPct: 0, maxPct: 12 },
  { id: "vital_wheat_gluten", name: "Vital Wheat Gluten", category: "Strengtheners", defaultPct: 1.5, minPct: 0, maxPct: 5 },
  { id: "diastatic_malt", name: "Diastatic Malt", category: "Strengtheners", defaultPct: 0.3, minPct: 0, maxPct: 2 },
  { id: "egg", name: "Egg", category: "Enrichment", defaultPct: 4, minPct: 0, maxPct: 12 }
]);

const STARTUP_WORKFLOWS = Object.freeze([
  { id: "blank", label: "Blank Calculator" },
  { id: "ny_style", label: "NY Style" },
  { id: "neapolitan", label: "Neapolitan" },
  { id: "detroit", label: "Detroit" }
]);

const DEFAULT_PREFS = Object.freeze({
  version: 4,
  general: {
    weightUnit: "grams",
    sizeUnit: "inches",
    calculationMethod: "DBW",
    defaultShape: "round",
    defaultSurfaceType: "deck",
    startupWorkflow: "blank",
    defaultDoughBallWeight: 280,
    defaultThicknessFactor: 0.1,
    showWarnings: true,
    enableDoughAnalysis: true,
    defaultFermentationModelId: "txcraig_v1"
  },
  workflow: {
    preferments: true,
    toppings: false,
    sauce: false,
    doughAnalysis: true
  },
  ovens: {
    selectedIds: [],
    defaultOvenId: null,
    custom: []
  },
  flours: {
    favoriteIds: ["ka_bread", "all_trumps", "cuoco_red"],
    defaultBlend: [],
    custom: []
  },
  ingredients: {
    selectedIds: ["honey"],
    custom: []
  }
});

export { PREFS_KEY, BUILTIN_OVENS, BUILTIN_INGREDIENTS, STARTUP_WORKFLOWS };

export function loadPrefs() {
  const stored = readJson(PREFS_KEY);
  if (stored) return normalizePrefs(stored);

  const legacy = readJson(LEGACY_PREFS_KEY);
  if (legacy) return normalizePrefs(migrateLegacyPrefs(legacy));

  return clone(DEFAULT_PREFS);
}

export function savePrefs(prefs) {
  const normalized = normalizePrefs(prefs);
  localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
}

export function initPrefs() {
  const prefs = loadPrefs();
  savePrefs(prefs);
  return prefs;
}

export function getAllOvens(prefs) {
  const selectedIds = new Set(normalizeStringArray(prefs?.ovens?.selectedIds ?? prefs?.ovens?.favoriteIds));
  const custom = normalizeCustomOvens(prefs?.ovens?.custom);

  const builtins = BUILTIN_OVENS.map((oven) => ({
    ...oven,
    builtin: true,
    selected: selectedIds.has(oven.id),
    favorite: selectedIds.has(oven.id)
  }));

  return [...builtins, ...custom.map((oven) => ({
    ...oven,
    builtin: false,
    selected: selectedIds.has(oven.id),
    favorite: selectedIds.has(oven.id)
  }))];
}

export function getSelectedOvens(prefs) {
  return getAllOvens(prefs).filter((oven) => oven.selected);
}

export function getFavoriteOvens(prefs) {
  return getSelectedOvens(prefs);
}

export function getOven(prefs, ovenId) {
  return getAllOvens(prefs).find((oven) => oven.id === ovenId) || null;
}

export function getDefaultOvenId(prefs) {
  const selectedIds = new Set(getSelectedOvens(prefs).map((oven) => oven.id));
  const preferred = String(prefs?.ovens?.defaultOvenId || "").trim();
  return selectedIds.has(preferred) ? preferred : null;
}

export function getCustomFlours(prefs) {
  return normalizeCustomFlours(prefs?.flours?.custom);
}

export function getFavoriteFlourIds(prefs) {
  return normalizeStringArray(prefs?.flours?.favoriteIds);
}

export function getDefaultBlend() {
  return [];
}

export function getSelectedIngredientIds(prefs) {
  return normalizeStringArray(prefs?.ingredients?.selectedIds ?? prefs?.ingredients?.favoriteIds);
}

export function getFavoriteIngredientIds(prefs) {
  return getSelectedIngredientIds(prefs);
}

export function getAllIngredients(prefs) {
  const selectedIds = new Set(getSelectedIngredientIds(prefs));
  const custom = normalizeCustomIngredients(prefs?.ingredients?.custom);
  const builtins = BUILTIN_INGREDIENTS.map((ingredient) => ({
    ...ingredient,
    builtIn: true,
    selected: selectedIds.has(ingredient.id),
    bookmarked: selectedIds.has(ingredient.id)
  }));

  return [...builtins, ...custom.map((ingredient) => ({
    ...ingredient,
    builtIn: false,
    selected: selectedIds.has(ingredient.id),
    bookmarked: selectedIds.has(ingredient.id)
  }))];
}

export function isWorkflowEnabled(prefs, key) {
  return Boolean(normalizePrefs(prefs).workflow[key]);
}

export function normalizePrefs(input) {
  const base = clone(DEFAULT_PREFS);
  const next = mergeDeep(base, input && typeof input === "object" ? input : {});

  next.version = 4;

  next.general.weightUnit = next.general.weightUnit === "ounces" ? "ounces" : "grams";
  next.general.sizeUnit = next.general.sizeUnit === "centimeters" ? "centimeters" : "inches";
  next.general.calculationMethod = next.general.calculationMethod === "TF" ? "TF" : "DBW";
  next.general.defaultShape = next.general.defaultShape === "rectangular" ? "rectangular" : "round";
  next.general.defaultSurfaceType = next.general.defaultSurfaceType === "pan" ? "pan" : "deck";
  next.general.startupWorkflow = sanitizeStartupWorkflow(next.general.startupWorkflow || next.general.defaultTemplateId);
  next.general.defaultDoughBallWeight = clampNumber(next.general.defaultDoughBallWeight, 50, 2000, DEFAULT_PREFS.general.defaultDoughBallWeight);
  next.general.defaultThicknessFactor = clampNumber(next.general.defaultThicknessFactor, 0.05, 0.2, DEFAULT_PREFS.general.defaultThicknessFactor);
  next.general.showWarnings = Boolean(next.general.showWarnings);
  next.general.enableDoughAnalysis = Boolean(next.general.enableDoughAnalysis);
  next.general.defaultFermentationModelId = String(next.general.defaultFermentationModelId || DEFAULT_PREFS.general.defaultFermentationModelId);

  next.workflow.preferments = Boolean(next.workflow.preferments);
  next.workflow.toppings = Boolean(next.workflow.toppings);
  next.workflow.sauce = Boolean(next.workflow.sauce);
  next.workflow.doughAnalysis = Boolean(next.workflow.doughAnalysis);

  next.ovens.selectedIds = normalizeStringArray(next.ovens.selectedIds ?? next.ovens.favoriteIds);
  next.ovens.custom = normalizeCustomOvens(next.ovens.custom);
  next.ovens.defaultOvenId = sanitizeDefaultOvenId(next.ovens.defaultOvenId, next.ovens.selectedIds, next.ovens.custom);

  next.flours.favoriteIds = normalizeStringArray(next.flours.favoriteIds);
  next.flours.custom = normalizeCustomFlours(next.flours.custom);
  next.flours.defaultBlend = [];

  next.ingredients.selectedIds = normalizeStringArray(next.ingredients.selectedIds ?? next.ingredients.favoriteIds);
  next.ingredients.custom = normalizeCustomIngredients(next.ingredients.custom);

  return next;
}

function migrateLegacyPrefs(legacy) {
  const migrated = clone(DEFAULT_PREFS);

  if (legacy.massUnitsDefault === "imperial") migrated.general.weightUnit = "ounces";
  if (legacy.sizeUnitsDefault === "metric") migrated.general.sizeUnit = "centimeters";
  if (legacy.defaultFermentationModelId) migrated.general.defaultFermentationModelId = legacy.defaultFermentationModelId;
  if (legacy.signalsMode === "off") migrated.general.showWarnings = false;

  const legacyOvens = Array.isArray(legacy.ovens) ? legacy.ovens : [];
  if (legacyOvens.length) {
    migrated.ovens.custom = legacyOvens.map((oven) => ({
      id: slugId(oven.id || oven.name || `oven_${Date.now()}`),
      name: String(oven.name || "Custom Oven"),
      type: String(oven.type || "custom"),
      minTemperature: clampNumber(oven.minTemperature, 0, 1200, null),
      maxTemperature: clampNumber((oven.maxTemperature != null ? oven.maxTemperature : (oven.maxRoundIn != null ? Number(oven.maxRoundIn) * 40 : null)), 0, 1200, 750),
      notes: String(oven.notes || "")
    }));
    migrated.ovens.selectedIds = migrated.ovens.custom.map((oven) => oven.id);
  }

  if (legacy.defaultOvenId) migrated.ovens.defaultOvenId = slugId(legacy.defaultOvenId);
  if (Array.isArray(legacy.favoriteFlours)) migrated.flours.favoriteIds = normalizeStringArray(legacy.favoriteFlours);

  return migrated;
}

function sanitizeStartupWorkflow(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_PREFS.general.startupWorkflow;
  if (STARTUP_WORKFLOWS.some((item) => item.id === raw)) return raw;
  if (raw === "ny_round") return "ny_style";
  return DEFAULT_PREFS.general.startupWorkflow;
}

function sanitizeDefaultOvenId(defaultOvenId, selectedIds, custom) {
  const builtinIds = BUILTIN_OVENS.map((oven) => oven.id);
  const customIds = normalizeCustomOvens(custom).map((oven) => oven.id);
  const validIds = new Set([...builtinIds, ...customIds]);
  const preferred = String(defaultOvenId || "").trim();
  const selected = new Set(normalizeStringArray(selectedIds));
  if (validIds.has(preferred) && selected.has(preferred)) return preferred;
  return null;
}

function normalizeCustomOvens(items) {
  const source = Array.isArray(items) ? items : [];
  return source
    .map((item, index) => {
      const name = String(item?.name || "").trim();
      if (!name) return null;

      return {
        id: slugId(item.id || `custom_oven_${index + 1}_${name}`),
        name,
        type: String(item?.type || "custom").trim() || "custom",
        minTemperature: clampNumber(item?.minTemperature, 0, 1200, null),
        maxTemperature: clampNumber(item?.maxTemperature, 0, 1200, 750),
        notes: String(item?.notes || "")
      };
    })
    .filter(Boolean);
}

function normalizeCustomFlours(items) {
  const source = Array.isArray(items) ? items : [];
  return source
    .map((item, index) => {
      const name = String(item?.name || "").trim();
      if (!name) return null;

      const brand = String(item?.brand || "Custom").trim();
      const proteinPct = clampNumber(item?.proteinPct, 0, 30, null);
      const minPct = clampNumber(item?.absorption?.minPct ?? item?.absorptionMinPct, 0, 100, null);
      const maxPct = clampNumber(item?.absorption?.maxPct ?? item?.absorptionMaxPct, 0, 100, null);
      const wMin = clampNumber(item?.specs?.w?.min ?? item?.wValue, 0, 600, null);
      const plMin = clampNumber(item?.specs?.pl?.min ?? item?.plRatio, 0, 10, null);

      return {
        id: slugId(item.id || `custom_flour_${index + 1}_${brand}_${name}`),
        brand,
        name,
        type: String(item?.type || "Other").trim() || "Other",
        proteinPct,
        malted: Boolean(item?.malted),
        absorption: minPct != null || maxPct != null
          ? {
              minPct: minPct ?? maxPct ?? 0,
              maxPct: maxPct ?? minPct ?? 0,
              basis: "bakers_pct"
            }
          : null,
        specs: {
          w: wMin != null ? { min: wMin, max: wMin } : null,
          pl: plMin != null ? { min: plMin, max: plMin } : null
        },
        notes: String(item?.notes || ""),
        custom: true
      };
    })
    .filter(Boolean);
}

function normalizeCustomIngredients(items) {
  const source = Array.isArray(items) ? items : [];
  return source
    .map((item, index) => {
      const name = String(item?.name || "").trim();
      if (!name) return null;

      return {
        id: slugId(item.id || `custom_ingredient_${index + 1}_${name}`),
        name,
        category: String(item?.category || "Custom").trim() || "Custom",
        defaultPct: clampNumber(item?.defaultPct, 0, 100, 0),
        minPct: clampNumber(item?.minPct, 0, 100, 0),
        maxPct: clampNumber(item?.maxPct, 0, 100, 100)
      };
    })
    .filter(Boolean)
    .map((item) => ({
      ...item,
      maxPct: Math.max(item.minPct ?? 0, item.maxPct ?? 0)
    }));
}

function normalizeStringArray(items) {
  return Array.from(new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)));
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;

  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = value.slice();
      return;
    }
    if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      mergeDeep(target[key], value);
      return;
    }
    target[key] = value;
  });

  return target;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function slugId(value) {
  return String(value || "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
