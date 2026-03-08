const PREFS_KEY = "pdt.preferences";
const LEGACY_PREFS_KEY = "pdt_prefs_v1";

const BUILTIN_OVENS = Object.freeze([
  { id: "home_oven", name: "Home Oven", type: "home", minTemperature: 450, maxTemperature: 550 },
  { id: "home_steel", name: "Home Oven + Steel", type: "home", minTemperature: 500, maxTemperature: 650 },
  { id: "ooni_volt", name: "Ooni Volt", type: "electric", minTemperature: 650, maxTemperature: 850 },
  { id: "ooni_karu_12", name: "Ooni Karu 12", type: "hybrid", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_karu_16", name: "Ooni Karu 16", type: "hybrid", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_koda_12", name: "Ooni Koda 12", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "ooni_koda_16", name: "Ooni Koda 16", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_roccbox", name: "Gozney Roccbox", type: "gas", minTemperature: 700, maxTemperature: 950 },
  { id: "gozney_dome", name: "Gozney Dome", type: "hybrid", minTemperature: 700, maxTemperature: 1000 },
  { id: "deck_oven", name: "Deck Oven", type: "commercial", minTemperature: 500, maxTemperature: 700 },
  { id: "conveyor_oven", name: "Conveyor Oven", type: "commercial", minTemperature: 450, maxTemperature: 600 },
  { id: "wood_fired_oven", name: "Wood Fired Oven", type: "wood", minTemperature: 700, maxTemperature: 1000 }
]);

const DEFAULT_PREFS = Object.freeze({
  version: 2,
  general: {
    weightUnit: "grams",
    sizeUnit: "inches",
    calculationMethod: "DBW",
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
    favoriteIds: ["home_oven", "home_steel", "ooni_volt"],
    defaultOvenId: "home_oven",
    custom: []
  },
  flours: {
    favoriteIds: ["ka_bread", "all_trumps", "cuoco_red"],
    defaultBlend: [{ id: "ka_bread", pct: 100 }],
    custom: []
  }
});

export { PREFS_KEY, BUILTIN_OVENS };

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
  const favoriteIds = new Set(normalizeStringArray(prefs?.ovens?.favoriteIds));
  const custom = normalizeCustomOvens(prefs?.ovens?.custom);

  const builtins = BUILTIN_OVENS.map((oven) => ({
    ...oven,
    builtin: true,
    favorite: favoriteIds.has(oven.id)
  }));

  return [...builtins, ...custom.map((oven) => ({ ...oven, builtin: false, favorite: favoriteIds.has(oven.id) }))];
}

export function getFavoriteOvens(prefs) {
  return getAllOvens(prefs).filter((oven) => oven.favorite);
}

export function getOven(prefs, ovenId) {
  return getAllOvens(prefs).find((oven) => oven.id === ovenId) || null;
}

export function getDefaultOvenId(prefs) {
  const all = getAllOvens(prefs);
  if (!all.length) return null;
  const preferred = String(prefs?.ovens?.defaultOvenId || "").trim();
  return all.some((oven) => oven.id === preferred) ? preferred : all[0].id;
}

export function getCustomFlours(prefs) {
  return normalizeCustomFlours(prefs?.flours?.custom);
}

export function getFavoriteFlourIds(prefs) {
  return normalizeStringArray(prefs?.flours?.favoriteIds);
}

export function getDefaultBlend(prefs) {
  return normalizeBlendRows(prefs?.flours?.defaultBlend);
}

export function isWorkflowEnabled(prefs, key) {
  return Boolean(normalizePrefs(prefs).workflow[key]);
}

export function normalizePrefs(input) {
  const base = clone(DEFAULT_PREFS);
  const next = mergeDeep(base, input && typeof input === "object" ? input : {});

  next.version = 2;

  next.general.weightUnit = next.general.weightUnit === "ounces" ? "ounces" : "grams";
  next.general.sizeUnit = next.general.sizeUnit === "centimeters" ? "centimeters" : "inches";
  next.general.calculationMethod = next.general.calculationMethod === "TF" ? "TF" : "DBW";
  next.general.defaultDoughBallWeight = clampNumber(next.general.defaultDoughBallWeight, 50, 2000, DEFAULT_PREFS.general.defaultDoughBallWeight);
  next.general.defaultThicknessFactor = clampNumber(next.general.defaultThicknessFactor, 0.05, 0.2, DEFAULT_PREFS.general.defaultThicknessFactor);
  next.general.showWarnings = Boolean(next.general.showWarnings);
  next.general.enableDoughAnalysis = Boolean(next.general.enableDoughAnalysis);
  next.general.defaultFermentationModelId = String(next.general.defaultFermentationModelId || DEFAULT_PREFS.general.defaultFermentationModelId);

  next.workflow.preferments = Boolean(next.workflow.preferments);
  next.workflow.toppings = Boolean(next.workflow.toppings);
  next.workflow.sauce = Boolean(next.workflow.sauce);
  next.workflow.doughAnalysis = Boolean(next.workflow.doughAnalysis);

  next.ovens.favoriteIds = normalizeStringArray(next.ovens.favoriteIds);
  next.ovens.custom = normalizeCustomOvens(next.ovens.custom);
  next.ovens.defaultOvenId = sanitizeDefaultOvenId(next.ovens.defaultOvenId, next.ovens.favoriteIds, next.ovens.custom);

  next.flours.favoriteIds = normalizeStringArray(next.flours.favoriteIds);
  next.flours.custom = normalizeCustomFlours(next.flours.custom);
  next.flours.defaultBlend = normalizeBlendRows(next.flours.defaultBlend);

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
    migrated.ovens.favoriteIds = migrated.ovens.custom.map((oven) => oven.id);
    migrated.ovens.defaultOvenId = migrated.ovens.custom[0]?.id || migrated.ovens.defaultOvenId;
  }

  if (legacy.defaultOvenId) migrated.ovens.defaultOvenId = slugId(legacy.defaultOvenId);

  return migrated;
}

function sanitizeDefaultOvenId(defaultOvenId, favoriteIds, custom) {
  const builtinIds = BUILTIN_OVENS.map((oven) => oven.id);
  const customIds = normalizeCustomOvens(custom).map((oven) => oven.id);
  const validIds = new Set([...builtinIds, ...customIds]);
  const preferred = String(defaultOvenId || "").trim();
  if (validIds.has(preferred)) return preferred;

  const favorite = normalizeStringArray(favoriteIds).find((id) => validIds.has(id));
  if (favorite) return favorite;

  return BUILTIN_OVENS[0]?.id || null;
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

function normalizeBlendRows(rows) {
  const source = Array.isArray(rows) ? rows : [];
  const cleaned = source
    .map((row) => ({
      id: String(row?.id || "").trim(),
      pct: clampNumber(row?.pct, 0, 100, 0)
    }))
    .filter((row) => row.id);

  if (!cleaned.length) return clone(DEFAULT_PREFS.flours.defaultBlend);

  const total = cleaned.reduce((sum, row) => sum + row.pct, 0);
  if (total <= 0) {
    const even = Math.floor(100 / cleaned.length);
    let remainder = 100 - even * cleaned.length;
    return cleaned.map((row) => ({
      id: row.id,
      pct: even + (remainder-- > 0 ? 1 : 0)
    }));
  }

  const scaled = cleaned.map((row) => ({
    id: row.id,
    pct: Math.round((row.pct / total) * 100)
  }));

  let diff = 100 - scaled.reduce((sum, row) => sum + row.pct, 0);
  let index = 0;
  while (diff !== 0 && scaled.length) {
    scaled[index % scaled.length].pct += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    index += 1;
  }

  return scaled;
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
