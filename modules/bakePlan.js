// B1) /modules/bakePlan.js
// Headless: generates a BakePlan payload for QR export.
// No DOM. No storage. No fetch.

export function buildBakePlanV1({
  tz,
  title,
  bakeAtMs,
  timelineSpec,     // durations / offsets relative to bake time
  recipeSnapshot    // minimal snapshot from your engine output
}) {
  if (!bakeAtMs || !Number.isFinite(bakeAtMs)) throw new Error("buildBakePlanV1: bakeAtMs required");
  if (!timelineSpec) throw new Error("buildBakePlanV1: timelineSpec required");

  const id = makePlanId(bakeAtMs);

  const events = buildEventsV1(bakeAtMs, timelineSpec);

  return {
    v: 1,
    id,
    tz: tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    title: title || "Bake Plan",
    bakeAt: bakeAtMs,
    events,
    r: normalizeRecipeSnapshotV1(recipeSnapshot)
  };
}

// B2) Timeline generator (backward from bake time)
export function buildEventsV1(bakeAtMs, spec) {
  // spec is an array of stages with offset minutes from bake time (negative values)
  // Example: [{k:"mix", offMin:-420},{k:"ball", offMin:-300},...{k:"bake", offMin:0}]
  const out = [];

  for (const s of spec) {
    if (!s?.k) continue;
    const off = Number(s.offMin || 0);
    const t = bakeAtMs + off * 60_000;
    out.push({ k: s.k, t });
  }

  // Ensure bake exists
  if (!out.some(e => e.k === "bake")) out.push({ k: "bake", t: bakeAtMs });

  // Sort ascending by time
  out.sort((a, b) => a.t - b.t);
  return out;
}

// B3) Recipe snapshot normalizer (keep it tiny)
export function normalizeRecipeSnapshotV1(r) {
  if (!r) return null;

  // Expected minimal fields (all optional except ing.f + ing.w ideally)
  // r = { u:"g", b, bw, tw, sh, sz, tf, hy, ing:{f,w,s,y,o}, pref }
  const ing = r.ing || {};
  const snap = {
    u: "g",
    b: numOrNull(r.b),
    bw: numOrNull(r.bw),
    tw: numOrNull(r.tw),
    sh: strOrNull(r.sh),
    sz: strOrNull(r.sz),
    tf: numOrNull(r.tf),
    hy: numOrNull(r.hy),
    ing: {
      f: numOrNull(ing.f),
      w: numOrNull(ing.w),
      s: numOrNull(ing.s),
      y: numOrNull(ing.y),
      o: numOrNull(ing.o)
    },
    pref: strOrNull(r.pref)
  };

  // If we have essentially nothing, return null
  const hasIng = snap.ing.f || snap.ing.w || snap.ing.s || snap.ing.y || snap.ing.o;
  if (!hasIng && !snap.tw && !snap.bw) return null;

  return snap;
}

// B4) Utilities
function makePlanId(bakeAtMs) {
  const d = new Date(bakeAtMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `bp_${y}${m}${da}_${hh}${mm}`;
}
function numOrNull(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
function strOrNull(v){ const s = (v ?? "").toString().trim(); return s ? s : null; }