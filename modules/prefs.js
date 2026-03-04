/* =========================================================
   1) Prefs Module (global) – ovens + defaults + feature gates
   ========================================================= */

/* 1a) Storage key + version */
const PREFS_KEY = "pdt_prefs_v1";

/* 1b) Default prefs (keep minimal for this iteration) */
const DEFAULT_PREFS = {
  version: 1,

  /* 1b.1) Unit defaults (display + input preference) */
  sizeUnitsDefault: "imperial",   // imperial (in) | metric (cm)
  massUnitsDefault: "metric",     // metric (g) | imperial (oz)

  defaultOvenId: null,
  ovens: [],

  ovenConstraints: {
    mode: "subtle"                // off | subtle | hard
  },

  signalsMode: "subtle",
  defaultFermentationModelId: "txcraig_v1"
};

/* 1c) Load prefs (merge defaults) */
export function loadPrefs() {
  const raw = safeJsonParse(localStorage.getItem(PREFS_KEY));
  return mergeDeep(structuredClone(DEFAULT_PREFS), raw || {});
}

/* 1d) Save prefs */
export function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/* 1e) Ensure prefs exist (call once at boot) */
export function initPrefs() {
  const prefs = loadPrefs();

  // 1e.1) Migration: older prefs may have unitsDefault
  if (prefs.unitsDefault && !prefs.sizeUnitsDefault) {
    prefs.sizeUnitsDefault = prefs.unitsDefault; // imperial/metric
    delete prefs.unitsDefault;
  }
  if (!prefs.massUnitsDefault) prefs.massUnitsDefault = "metric";
  if (!prefs.sizeUnitsDefault) prefs.sizeUnitsDefault = "imperial";

  // ...rest of your initPrefs stays the same

  // If no ovens exist, seed a couple examples (safe to remove later)
  // Keeps UI from looking empty during early development.
  if (!Array.isArray(prefs.ovens)) prefs.ovens = [];
  if (prefs.ovens.length === 0) {
    prefs.ovens = [
      { id: "home_oven", name: "Home Oven", maxRoundIn: 16 },
      { id: "ooni_volt", name: "Ooni Volt", maxRoundIn: 12 }
    ];
    prefs.defaultOvenId = prefs.defaultOvenId || "home_oven";
    savePrefs(prefs);
  }

  return prefs;
}

/* 1f) Feature gate: oven widget should mount? */
export function isOvenFeatureEnabled(prefs) {
  return !!prefs && prefs.ovenConstraints?.mode !== "off";
}

/* 1g) Get oven by id */
export function getOven(prefs, ovenId) {
  return (prefs?.ovens || []).find(o => o.id === ovenId) || null;
}

/* 1h) Get default oven id (fallback to first oven if needed) */
export function getDefaultOvenId(prefs) {
  if (!prefs?.ovens?.length) return null;
  return prefs.defaultOvenId || prefs.ovens[0].id;
}

/* =========================================================
   2) Helpers
   ========================================================= */

function safeJsonParse(s) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

function mergeDeep(target, src) {
  if (!src || typeof src !== "object") return target;

  for (const k of Object.keys(src)) {
    const v = src[k];

    if (Array.isArray(v)) {
      target[k] = v.slice();
      continue;
    }

    if (v && typeof v === "object") {
      if (!target[k] || typeof target[k] !== "object") target[k] = {};
      mergeDeep(target[k], v);
      continue;
    }

    target[k] = v;
  }

  return target;
}