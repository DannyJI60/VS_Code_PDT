// modules/flourBlendMath.js
// Keeps blend math separate + safe.

export function normalizePct(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// blend: [{ id, pct, flour }]
// flour must carry: proteinPct (number), absorption:{minPct,maxPct}
export function computeBlendStats(blend) {
  const rows = Array.isArray(blend) ? blend : [];
  const totalPct = rows.reduce((s, r) => s + normalizePct(r.pct), 0) || 0;

  if (!rows.length || totalPct <= 0) {
    return {
      totalPct: 0,
      proteinPct: null,
      absorption: null, // {minPct,maxPct}
      count: 0
    };
  }

  const w = (pct) => normalizePct(pct) / totalPct;

  let protein = 0;
  let hasProtein = false;

  let absMin = 0;
  let absMax = 0;
  let hasAbs = false;

  for (const r of rows) {
    const f = r.flour || {};
    const weight = w(r.pct);

    if (typeof f.proteinPct === "number") {
      protein += f.proteinPct * weight;
      hasProtein = true;
    }

    const a = f.absorption;
    if (a && a.minPct != null && a.maxPct != null) {
      absMin += Number(a.minPct) * weight;
      absMax += Number(a.maxPct) * weight;
      hasAbs = true;
    }
  }

  return {
    totalPct,
    proteinPct: hasProtein ? round1(protein) : null,
    absorption: hasAbs ? { minPct: round1(absMin), maxPct: round1(absMax) } : null,
    count: rows.length
  };
}

function round1(x) {
  return Math.round(Number(x) * 10) / 10;
}