import { computeBlendStats } from "./flourBlendMath.js";
import { getAllOvens, getDefaultBlend, getDefaultOvenId } from "./prefs.js";

const OUNCES_PER_GRAM = 0.03527396195;
const GRAMS_PER_OUNCE = 28.349523125;
const CM_PER_INCH = 2.54;
const DEFAULT_SALT_PCT = 2.8;

export const TEMPLATE_LIBRARY = Object.freeze([
  {
    id: "ny_style",
    name: "NY Style",
    summary: "Balanced deck-friendly dough for a foldable slice.",
    defaults: {
      hydrationPct: 63,
      calcMethod: "DBW",
      doughBallWeight: 280,
      doughCount: 2,
      shape: "round",
      diameterIn: 14,
      surfaceType: "deck",
      ovenId: "deck_oven",
      flourBlend: [
        { id: "all_trumps", pct: 60 },
        { id: "ka_bread", pct: 40 }
      ],
      fermentation: {
        durationHours: 48,
        coldFermentHours: 24,
        roomTempF: 68,
        doughTempF: 68,
        prefermentEnabled: false
      }
    }
  },
  {
    id: "detroit",
    name: "Detroit",
    summary: "Pan-baked rectangular dough with a taller, softer structure.",
    defaults: {
      hydrationPct: 70,
      calcMethod: "DBW",
      doughBallWeight: 620,
      doughCount: 1,
      shape: "rectangular",
      widthIn: 10,
      lengthIn: 14,
      surfaceType: "pan",
      ovenId: "home_steel",
      flourBlend: [
        { id: "high_mountain", pct: 50 },
        { id: "all_trumps", pct: 50 }
      ],
      fermentation: {
        durationHours: 36,
        coldFermentHours: 18,
        roomTempF: 70,
        doughTempF: 70,
        prefermentEnabled: false
      }
    }
  },
  {
    id: "neapolitan",
    name: "Neapolitan",
    summary: "High-heat round dough tuned for leopard spotting and soft chew.",
    defaults: {
      hydrationPct: 62,
      calcMethod: "DBW",
      doughBallWeight: 255,
      doughCount: 2,
      shape: "round",
      diameterIn: 12,
      surfaceType: "deck",
      ovenId: "wood_fired_oven",
      flourBlend: [
        { id: "pizzeria_blue", pct: 70 },
        { id: "cuoco_red", pct: 30 }
      ],
      fermentation: {
        durationHours: 24,
        coldFermentHours: 8,
        roomTempF: 68,
        doughTempF: 68,
        prefermentEnabled: false
      }
    }
  }
]);

export function createRecipeSession(prefs, existingSession = null) {
  const base = createRecipeSessionShell(prefs);
  const merged = mergeDeep(base, existingSession && typeof existingSession === "object" ? existingSession : {});
  return normalizeSession(merged, prefs);
}

export function normalizeSession(session, prefs) {
  const next = mergeDeep(createRecipeSessionShell(prefs), session || {});

  next.version = Math.max(2, Number(next.version || 2));
  next.startMode = ["custom", "template", "import"].includes(next.startMode) ? next.startMode : "custom";
  next.templateId = String(next.templateId || "").trim() || null;
  next.weightUnit = next.weightUnit === "ounces" ? "ounces" : "grams";
  next.sizeUnit = next.sizeUnit === "centimeters" ? "centimeters" : "inches";
  next.calcMethod = next.calcMethod === "TF" ? "TF" : "DBW";
  next.doughBallWeight = clamp(next.doughBallWeight, 50, 2000, prefs?.general?.defaultDoughBallWeight || 280);
  next.thicknessFactor = clamp(next.thicknessFactor, 0.05, 0.2, prefs?.general?.defaultThicknessFactor || 0.1);
  next.hydrationPct = clamp(next.hydrationPct, 45, 90, 62);
  next.doughCount = Math.max(1, Math.round(Number(next.doughCount || 1)));
  next.shape = next.shape === "rectangular" ? "rectangular" : "round";
  next.diameterIn = clamp(next.diameterIn, 6, 30, 12);
  next.widthIn = clamp(next.widthIn, 6, 30, 10);
  next.lengthIn = clamp(next.lengthIn, 6, 40, 14);
  next.surfaceType = next.surfaceType === "pan" ? "pan" : "deck";
  const validOvenIds = new Set(getAllOvens(prefs).map((oven) => oven.id));
  const requestedOvenId = String(next.ovenId || getDefaultOvenId(prefs) || "").trim();
  next.ovenId = validOvenIds.has(requestedOvenId) ? requestedOvenId : (getDefaultOvenId(prefs) || null);
  next.warningsEnabled = Boolean(next.warningsEnabled);
  next.analysisEnabled = Boolean(next.analysisEnabled);
  next.workflow = {
    preferments: Boolean(next.workflow?.preferments),
    toppings: Boolean(next.workflow?.toppings),
    sauce: Boolean(next.workflow?.sauce),
    doughAnalysis: Boolean(next.workflow?.doughAnalysis)
  };
  next.flourBlend = normalizeBlend(next.flourBlend);
  next.fermentation = {
    durationHours: clamp(next.fermentation?.durationHours, 4, 168, 24),
    coldFermentHours: clamp(next.fermentation?.coldFermentHours, 0, 144, 0),
    roomTempF: clamp(next.fermentation?.roomTempF, 45, 100, 70),
    doughTempF: clamp(next.fermentation?.doughTempF, 45, 100, 70),
    yeastModel: String(next.fermentation?.yeastModel || prefs?.general?.defaultFermentationModelId || "txcraig_v1"),
    yeastMode: next.fermentation?.yeastMode === "manual" ? "manual" : "auto",
    manualYeastPct: clamp(next.fermentation?.manualYeastPct, 0, 5, 0.12),
    prefermentEnabled: Boolean(next.fermentation?.prefermentEnabled),
    prefermentType: ["poolish", "biga", "sourdough"].includes(next.fermentation?.prefermentType) ? next.fermentation.prefermentType : "poolish",
    prefermentHydration: clamp(next.fermentation?.prefermentHydration, 45, 120, 100),
    prefermentPercent: clamp(next.fermentation?.prefermentPercent, 5, 60, 20)
  };
  next.formula = normalizeFormula(next.formula);
  next.optional = {
    toppingsNotes: String(next.optional?.toppingsNotes || ""),
    sauceNotes: String(next.optional?.sauceNotes || "")
  };
  next.notes = String(next.notes || "");

  return next;
}

export function applyTemplateToSession(session, templateId, prefs) {
  const template = TEMPLATE_LIBRARY.find((item) => item.id === templateId);
  if (!template) return normalizeSession(session, prefs);

  const next = mergeDeep(createRecipeSessionShell(prefs), normalizeSession(session, prefs));
  mergeDeep(next, template.defaults);
  next.templateId = template.id;
  next.startMode = "template";
  return normalizeSession(next, prefs);
}

export function computeRecipe(session, prefs, flourCatalog = []) {
  const normalized = normalizeSession(session, prefs);
  const catalogById = new Map((Array.isArray(flourCatalog) ? flourCatalog : []).map((flour) => [flour.id, flour]));
  const resolvedBlend = normalized.flourBlend
    .map((row) => ({ ...row, flour: catalogById.get(row.id) || row.flour || null }))
    .filter((row) => row.id);

  const blendStats = computeBlendStats(resolvedBlend);
  const oven = getAllOvens(prefs).find((item) => item.id === normalized.ovenId) || null;

  const areaPerPizzaIn2 = normalized.shape === "round"
    ? Math.PI * Math.pow(normalized.diameterIn / 2, 2)
    : normalized.widthIn * normalized.lengthIn;
  const totalAreaIn2 = areaPerPizzaIn2 * normalized.doughCount;
  const totalDoughG = normalized.calcMethod === "DBW"
    ? normalized.doughCount * normalized.doughBallWeight
    : totalAreaIn2 * normalized.thicknessFactor * GRAMS_PER_OUNCE;
  const doughBallWeightG = totalDoughG / normalized.doughCount;

  const saltPct = Number(normalized.formula.saltPct || DEFAULT_SALT_PCT);
  const oilPct = Number(normalized.formula.oilPct || 0);
  const yeastPct = estimateYeastPct(normalized, blendStats);
  const extras = normalized.formula.extras.filter((row) => Number(row.pct || 0) > 0);
  const extraPct = extras.reduce((sum, row) => sum + Number(row.pct || 0), 0);

  const flourG = totalDoughG / (1 + (normalized.hydrationPct + saltPct + yeastPct + oilPct + extraPct) / 100);
  const waterG = flourG * (normalized.hydrationPct / 100);
  const saltG = flourG * (saltPct / 100);
  const yeastG = flourG * (yeastPct / 100);
  const oilG = flourG * (oilPct / 100);
  const extraRows = extras.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    pct: Number(row.pct || 0),
    weightG: flourG * (Number(row.pct || 0) / 100)
  }));

  const preferment = normalized.fermentation.prefermentEnabled
    ? buildPreferment(normalized, flourG, yeastG)
    : null;

  const netIngredients = buildNetIngredients({
    hydrationPct: normalized.hydrationPct,
    flourG,
    waterG,
    saltG,
    saltPct,
    yeastG,
    yeastPct,
    oilG,
    oilPct,
    extraRows
  });

  const finalDough = buildFinalDoughIngredients({
    hydrationPct: normalized.hydrationPct,
    flourG,
    waterG,
    saltG,
    saltPct,
    oilG,
    oilPct,
    extraRows,
    preferment
  });

  const fermentationTimeline = buildTimeline(normalized);
  const analysis = buildAnalysis(normalized, blendStats, oven, resolvedBlend);
  const warnings = normalized.warningsEnabled ? buildWarnings(normalized, analysis, oven) : [];
  const complete = Number.isFinite(totalDoughG) && totalDoughG > 0 && normalized.hydrationPct > 0;
  const template = TEMPLATE_LIBRARY.find((item) => item.id === normalized.templateId) || null;

  const recipe = {
    complete,
    session: normalized,
    oven,
    blend: resolvedBlend,
    blendStats,
    preferment,
    analysis,
    warnings,
    tables: {
      preferment: preferment?.rows || [],
      finalDough,
      netIngredients
    },
    totals: {
      totalAreaIn2,
      totalDoughG,
      doughBallWeightG,
      flourG,
      waterG,
      saltG,
      yeastG,
      oilG
    },
    percentages: {
      hydrationPct: normalized.hydrationPct,
      saltPct,
      yeastPct,
      oilPct,
      extrasPct: extraPct
    },
    fermentationTimeline,
    masterFormulaTitle: template ? `${template.name} Pizza Dough` : "Custom Pizza Dough",
    labels: {
      size: normalized.shape === "round"
        ? `${formatLength(normalized.diameterIn, normalized.sizeUnit)} round`
        : `${formatLength(normalized.widthIn, normalized.sizeUnit)} x ${formatLength(normalized.lengthIn, normalized.sizeUnit)} pan`,
      ballWeight: formatWeight(doughBallWeightG, normalized.weightUnit),
      totalDough: formatWeight(totalDoughG, normalized.weightUnit),
      totalFlour: formatWeight(flourG, normalized.weightUnit),
      surface: normalized.surfaceType === "pan" ? "Pan" : "Deck",
      oven: oven?.name || "No oven selected",
      calculation: normalized.calcMethod === "DBW" ? "Dough Ball Weight" : "Thickness Factor"
    }
  };

  recipe.copyText = buildRecipeMarkdown(recipe);
  recipe.exportPayload = buildRecipeExport(normalized, recipe);
  return recipe;
}

export function buildRecipeExport(session, recipe) {
  const cleanBlend = (recipe?.blend || []).map((row) => ({ id: row.id, pct: row.pct }));
  return {
    kind: "prodoughtype.recipe",
    version: 2,
    exportedAt: new Date().toISOString(),
    session: {
      ...session,
      flourBlend: cleanBlend
    },
    recipe: {
      totals: roundObject(recipe?.totals),
      percentages: roundObject(recipe?.percentages),
      tables: roundObject(recipe?.tables),
      timeline: recipe?.fermentationTimeline || [],
      analysis: recipe?.analysis || null,
      warnings: recipe?.warnings || []
    }
  };
}

export function importRecipePayload(text, prefs) {
  const parsed = JSON.parse(text);
  if (parsed?.kind !== "prodoughtype.recipe" || !parsed?.session) {
    throw new Error("Unsupported import file.");
  }
  return normalizeSession(parsed.session, prefs);
}

export function formatWeight(grams, unit) {
  const value = Number(grams || 0);
  if (unit === "ounces") return `${round(value * OUNCES_PER_GRAM, 1)} oz`;
  return `${round(value, 0)} g`;
}

export function formatLength(inches, unit) {
  const value = Number(inches || 0);
  if (unit === "centimeters") return `${round(value * CM_PER_INCH, 1)} cm`;
  return `${round(value, 1)} in`;
}

export function toDisplayWeight(grams, unit) {
  return unit === "ounces" ? round(Number(grams || 0) * OUNCES_PER_GRAM, 1) : round(Number(grams || 0), 0);
}

export function fromDisplayWeight(value, unit) {
  const num = Number(value || 0);
  return unit === "ounces" ? num * GRAMS_PER_OUNCE : num;
}

export function toDisplayLength(inches, unit) {
  return unit === "centimeters" ? round(Number(inches || 0) * CM_PER_INCH, 1) : round(Number(inches || 0), 1);
}

export function fromDisplayLength(value, unit) {
  const num = Number(value || 0);
  return unit === "centimeters" ? num / CM_PER_INCH : num;
}

function createRecipeSessionShell(prefs) {
  return {
    version: 2,
    startMode: "custom",
    templateId: null,
    weightUnit: prefs?.general?.weightUnit || "grams",
    sizeUnit: prefs?.general?.sizeUnit || "inches",
    calcMethod: prefs?.general?.calculationMethod || "DBW",
    doughBallWeight: Number(prefs?.general?.defaultDoughBallWeight || 280),
    thicknessFactor: Number(prefs?.general?.defaultThicknessFactor || 0.1),
    hydrationPct: 62,
    doughCount: 2,
    shape: "round",
    diameterIn: 12,
    widthIn: 10,
    lengthIn: 14,
    surfaceType: "deck",
    ovenId: getDefaultOvenId(prefs),
    warningsEnabled: Boolean(prefs?.general?.showWarnings),
    analysisEnabled: Boolean(prefs?.general?.enableDoughAnalysis),
    workflow: {
      preferments: Boolean(prefs?.workflow?.preferments),
      toppings: Boolean(prefs?.workflow?.toppings),
      sauce: Boolean(prefs?.workflow?.sauce),
      doughAnalysis: Boolean(prefs?.workflow?.doughAnalysis)
    },
    flourBlend: getDefaultBlend(prefs),
    fermentation: {
      durationHours: 24,
      coldFermentHours: 0,
      roomTempF: 70,
      doughTempF: 70,
      yeastModel: prefs?.general?.defaultFermentationModelId || "txcraig_v1",
      yeastMode: "auto",
      manualYeastPct: 0.12,
      prefermentEnabled: false,
      prefermentType: "poolish",
      prefermentHydration: 100,
      prefermentPercent: 20
    },
    formula: {
      saltPct: DEFAULT_SALT_PCT,
      oilPct: 0,
      extras: []
    },
    optional: {
      toppingsNotes: "",
      sauceNotes: ""
    },
    notes: ""
  };
}

function normalizeBlend(rows) {
  const source = Array.isArray(rows) ? rows : [];
  const filtered = source
    .map((row) => ({ id: String(row?.id || "").trim(), pct: clamp(row?.pct, 0, 100, 0), flour: row?.flour || null }))
    .filter((row) => row.id);

  if (!filtered.length) return [];
  const total = filtered.reduce((sum, row) => sum + row.pct, 0);
  if (total <= 0) return filtered.map((row, index) => ({ ...row, pct: index === 0 ? 100 : 0 }));

  const normalized = filtered.map((row) => ({ ...row, pct: Math.round((row.pct / total) * 100) }));
  let diff = 100 - normalized.reduce((sum, row) => sum + row.pct, 0);
  let cursor = 0;
  while (diff !== 0 && normalized.length) {
    normalized[cursor % normalized.length].pct += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    cursor += 1;
  }
  return normalized;
}

function normalizeFormula(formula) {
  const extras = Array.isArray(formula?.extras) ? formula.extras : [];
  const normalizedExtras = [];
  const seen = new Set();

  extras.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    normalizedExtras.push({
      id,
      name: String(row?.name || row?.id || "Ingredient").trim() || "Ingredient",
      category: String(row?.category || "Custom").trim() || "Custom",
      pct: clamp(row?.pct, 0, 100, Number(row?.defaultPct || 0)),
      builtIn: Boolean(row?.builtIn)
    });
  });

  const legacySugarPct = clamp(formula?.sugarPct, 0, 20, 0);
  if (legacySugarPct > 0 && !seen.has("sugar")) {
    normalizedExtras.unshift({
      id: "sugar",
      name: "Sugar",
      category: "Sweeteners",
      pct: legacySugarPct,
      builtIn: true
    });
  }

  return {
    saltPct: clamp(formula?.saltPct, 0, 10, DEFAULT_SALT_PCT),
    oilPct: clamp(formula?.oilPct, 0, 20, 0),
    extras: normalizedExtras
  };
}

function estimateYeastPct(session, blendStats) {
  if (session.fermentation.yeastMode === "manual") {
    return round(clamp(session.fermentation.manualYeastPct, 0, 5, 0.12), 3);
  }

  const duration = Math.max(Number(session.fermentation.durationHours || 24), 4);
  const roomTemp = Math.max(Number(session.fermentation.roomTempF || 70), 45);
  const coldHours = Math.max(Number(session.fermentation.coldFermentHours || 0), 0);
  const strengthFactor = blendStats.proteinPct != null
    ? Math.max(0.8, Math.min(1.2, 13.2 / Math.max(blendStats.proteinPct, 10)))
    : 1;
  const modelFactor = session.fermentation.yeastModel === "txcraig_v1" ? 1 : 1.12;
  const coldFactor = coldHours > 0 ? 0.82 : 1;
  const prefermentFactor = session.fermentation.prefermentEnabled ? 0.72 : 1;
  const tempFactor = roomTemp / 70;

  const pct = 0.12 * (24 / duration) * tempFactor * strengthFactor * modelFactor * coldFactor * prefermentFactor;
  return round(Math.max(0.03, Math.min(0.8, pct)), 3);
}

function buildPreferment(session, totalFlourG, totalYeastG) {
  const flourPct = session.fermentation.prefermentPercent;
  const flourG = totalFlourG * (flourPct / 100);
  const waterPct = flourPct * (session.fermentation.prefermentHydration / 100);
  const waterG = totalFlourG * (waterPct / 100);
  const yeastPct = totalFlourG > 0 ? (totalYeastG / totalFlourG) * 100 : 0;
  const rows = [
    { name: "Flour", weightG: flourG, pct: flourPct },
    { name: "Water", weightG: waterG, pct: waterPct }
  ];

  if (totalYeastG > 0) {
    rows.push({ name: "Yeast", weightG: totalYeastG, pct: yeastPct });
  }

  return {
    name: capitalize(session.fermentation.prefermentType),
    type: session.fermentation.prefermentType,
    percent: flourPct,
    hydration: session.fermentation.prefermentHydration,
    flourG,
    waterG,
    yeastG: totalYeastG,
    totalG: rows.reduce((sum, row) => sum + row.weightG, 0),
    totalPct: rows.reduce((sum, row) => sum + row.pct, 0),
    rows
  };
}

function buildNetIngredients({ hydrationPct, flourG, waterG, saltG, saltPct, yeastG, yeastPct, oilG, oilPct, extraRows }) {
  const rows = [
    { name: "Flour", weightG: flourG, pct: 100 },
    { name: "Water", weightG: waterG, pct: hydrationPct },
    { name: "Salt", weightG: saltG, pct: saltPct },
    { name: "Yeast", weightG: yeastG, pct: yeastPct }
  ];

  if (oilPct > 0) {
    rows.push({ name: "Olive Oil", weightG: oilG, pct: oilPct });
  }

  extraRows.forEach((row) => rows.push({ name: row.name, weightG: row.weightG, pct: row.pct }));
  return rows.filter((row) => row.weightG > 0 || row.name === "Yeast");
}

function buildFinalDoughIngredients({ hydrationPct, flourG, waterG, saltG, saltPct, oilG, oilPct, extraRows, preferment }) {
  if (!preferment) {
    const rows = [
      { name: "Flour", weightG: flourG, pct: 100 },
      { name: "Water", weightG: waterG, pct: hydrationPct },
      { name: "Salt", weightG: saltG, pct: saltPct }
    ];
    if (oilPct > 0) rows.push({ name: "Olive Oil", weightG: oilG, pct: oilPct });
    extraRows.forEach((row) => rows.push({ name: row.name, weightG: row.weightG, pct: row.pct }));
    return rows;
  }

  const prefermentFlourPct = preferment.percent;
  const prefermentWaterPct = preferment.rows.find((row) => row.name === "Water")?.pct || 0;
  const finalRows = [
    { name: "Flour", weightG: flourG - preferment.flourG, pct: Math.max(0, 100 - prefermentFlourPct) },
    { name: "Water", weightG: waterG - preferment.waterG, pct: Math.max(0, hydrationPct - prefermentWaterPct) },
    { name: "Salt", weightG: saltG, pct: saltPct }
  ];

  if (oilPct > 0) finalRows.push({ name: "Olive Oil", weightG: oilG, pct: oilPct });
  extraRows.forEach((row) => finalRows.push({ name: row.name, weightG: row.weightG, pct: row.pct }));
  finalRows.push({ name: preferment.name, weightG: preferment.totalG, pct: preferment.totalPct });
  return finalRows.filter((row) => row.weightG > 0.0001 || row.name === "Salt");
}

function buildTimeline(session) {
  const total = Number(session.fermentation.durationHours || 24);
  const cold = Math.min(Number(session.fermentation.coldFermentHours || 0), total);
  const room = Math.max(total - cold, 0);
  const stages = [{ label: "Mix", detail: "Combine ingredients and rest the dough." }];

  if (session.fermentation.prefermentEnabled) {
    stages.push({
      label: capitalize(session.fermentation.prefermentType),
      detail: `${session.fermentation.prefermentPercent}% of flour at ${session.fermentation.prefermentHydration}% hydration.`
    });
  }

  if (room > 0) {
    stages.push({ label: "Room Fermentation", detail: `${round(room, 1)} h at ${round(session.fermentation.roomTempF, 0)} F.` });
  }
  if (cold > 0) {
    stages.push({ label: "Cold Fermentation", detail: `${round(cold, 1)} h chilled before baking.` });
  }

  stages.push({ label: "Bake", detail: "Bake when the dough is relaxed and fully proofed." });
  return stages;
}

function buildAnalysis(session, blendStats, oven, blendRows = []) {
  const hydration = Number(session.hydrationPct || 0);
  const duration = Number(session.fermentation.durationHours || 0);
  const absorption = blendStats.absorption;
  const maxHeatNeed = (blendRows || [])
    .map((row) => row.flour?.heat?.tempF?.min ?? null)
    .filter((value) => value != null)
    .reduce((max, value) => Math.max(max, Number(value || 0)), 0);

  let hydrationSignal = "gray";
  let hydrationText = "No flour absorption data available yet.";
  if (absorption) {
    if (hydration > absorption.maxPct + 2) {
      hydrationSignal = "red";
      hydrationText = `Hydration is above the blend absorption band of ${absorption.minPct}-${absorption.maxPct}%.`;
    } else if (hydration < absorption.minPct - 3) {
      hydrationSignal = "amber";
      hydrationText = `Hydration is below the blend absorption band of ${absorption.minPct}-${absorption.maxPct}%.`;
    } else {
      hydrationSignal = "green";
      hydrationText = `Hydration sits inside the blend absorption band of ${absorption.minPct}-${absorption.maxPct}%.`;
    }
  }

  let fermentationSignal = "gray";
  let fermentationText = "Fermentation guidance is estimate-only until a full data table is wired.";
  if (blendStats.proteinPct != null) {
    if (duration >= 72 && blendStats.proteinPct < 13) {
      fermentationSignal = "red";
      fermentationText = `A ${round(duration, 0)} h fermentation is aggressive for a ${blendStats.proteinPct}% protein blend.`;
    } else if (duration >= 48 && blendStats.proteinPct < 12.5) {
      fermentationSignal = "amber";
      fermentationText = `A ${round(duration, 0)} h fermentation may need a stronger flour blend.`;
    } else {
      fermentationSignal = "green";
      fermentationText = "Fermentation length is reasonable for the current flour strength.";
    }
  }

  let ovenSignal = "gray";
  let ovenText = oven ? `Selected oven range: ${oven.minTemperature}-${oven.maxTemperature} F.` : "No oven selected.";
  if (oven && maxHeatNeed > 0) {
    if (oven.maxTemperature < maxHeatNeed - 75) {
      ovenSignal = "red";
      ovenText = `${oven.name} tops out below the flour's preferred bake range.`;
    } else if (oven.maxTemperature < maxHeatNeed) {
      ovenSignal = "amber";
      ovenText = `${oven.name} is usable, but browning may lag the flour's preferred heat.`;
    } else {
      ovenSignal = "green";
      ovenText = `${oven.name} lines up with the flour's preferred heat range.`;
    }
  }

  const suggestions = [hydrationText, fermentationText, ovenText].filter(Boolean);

  return {
    hydration: { signal: hydrationSignal, text: hydrationText },
    fermentation: { signal: fermentationSignal, text: fermentationText },
    oven: { signal: ovenSignal, text: ovenText },
    suggestions
  };
}

function buildWarnings(session, analysis, oven) {
  const warnings = [];
  if (session.shape === "rectangular" && session.surfaceType === "deck") {
    warnings.push("Rectangular dough usually pairs better with a pan workflow than a deck workflow.");
  }
  if (session.calcMethod === "TF" && session.doughCount > 1) {
    warnings.push("Thickness Factor scales total dough across all dough balls. Double-check the per-ball target.");
  }
  if (analysis.hydration.signal === "red") warnings.push(analysis.hydration.text);
  if (analysis.fermentation.signal === "red") warnings.push(analysis.fermentation.text);
  if (analysis.oven.signal === "red") warnings.push(analysis.oven.text);
  if (!oven) warnings.push("Choose an oven to get oven compatibility guidance.");
  return warnings;
}

function buildRecipeMarkdown(recipe) {
  const lines = [
    "MASTER FORMULA",
    recipe.masterFormulaTitle,
    "",
    `Total Dough: ${recipe.labels.totalDough}`,
    `Dough Balls: ${recipe.session.doughCount}`,
    `Ball Weight: ${recipe.labels.ballWeight}`,
    `Total Flour: ${recipe.labels.totalFlour}`,
    ""
  ];

  if (recipe.preferment) {
    lines.push(`PREFERMENT (${recipe.preferment.name})`, "");
    lines.push(...markdownTable(recipe.tables.preferment, recipe.session.weightUnit));
    lines.push("", `Preferment Total: ${formatWeight(recipe.preferment.totalG, recipe.session.weightUnit)}`, "");
  }

  lines.push("FINAL DOUGH", "");
  lines.push(...markdownTable(recipe.tables.finalDough, recipe.session.weightUnit));
  lines.push("", "NET INGREDIENTS", "");
  lines.push(...markdownTable(recipe.tables.netIngredients, recipe.session.weightUnit));

  if (recipe.session.notes) {
    lines.push("", "NOTES", recipe.session.notes);
  }

  if (recipe.warnings.length) {
    lines.push("", "WARNINGS", ...recipe.warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

function markdownTable(rows, unit) {
  return [
    "Ingredient | Weight | Baker's %",
    "--- | ---: | ---:",
    ...rows.map((row) => `${row.name} | ${formatWeight(row.weightG, unit)} | ${formatPercent(row.pct)}%`)
  ];
}

function formatPercent(value) {
  const num = Number(value || 0);
  if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num));
  if (Math.abs(num * 10 - Math.round(num * 10)) < 0.001) return num.toFixed(1);
  return num.toFixed(2);
}

function roundObject(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => roundObject(item));
  const out = {};
  Object.keys(value).forEach((key) => {
    const item = value[key];
    out[key] = typeof item === "number" ? round(item, 3) : roundObject(item);
  });
  return out;
}

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = value.map((item) => (item && typeof item === "object" ? JSON.parse(JSON.stringify(item)) : item));
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

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function round(value, digits = 1) {
  const num = Number(value || 0);
  const factor = Math.pow(10, digits);
  return Math.round(num * factor) / factor;
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}
