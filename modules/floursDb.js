/* modules/floursDb.js
   Flour DB loader + UI mapping (safe, minimal)

   Reads store.get("indexes").databases.items for the "flours" dataset entry,
   fetches that JSON file, then returns a list shaped like the current flour
   browser prototype expects.

   Output items:
     { id, brand, name, type, protein, absorption, logo, _raw }

   Notes:
   - For v1 stability, we only emit flours that have BOTH:
       proteinPct (number) AND absorption.minPct/maxPct
   - absorption returned is a midpoint decimal (0..1) for sorting/UI.
*/

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed ${url}: ${r.status}`);
  return r.json();
}

function midpointPctRangeToDecimal(range) {
  if (!range || range.minPct == null || range.maxPct == null) return null;
  const midPct = (Number(range.minPct) + Number(range.maxPct)) / 2;
  return midPct / 100; // 0..1
}

export async function loadFloursForBrowser(store) {
  const indexes = store?.get?.("indexes") || {};
  const dbIndex = indexes.databases;
  const items = dbIndex?.items || [];

  const entry = items.find(
    (x) => x && x.id === "flours" && x.type === "dataset" && x.file
  );

  if (!entry) {
    console.warn("[floursDb] No databases_index entry for id='flours'.");
    return [];
  }

  const data = await fetchJson(entry.file);

  // Support both shapes:
  //  - { items:[...] }  (your unified DB)
  //  - [...]            (plain array)
  const raw = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

  return raw
    .filter(
      (f) =>
        typeof f?.proteinPct === "number" &&
        f?.absorption?.minPct != null &&
        f?.absorption?.maxPct != null
    )
    .map((f) => {
      const absorption = midpointPctRangeToDecimal(f.absorption);
      return {
        id: f.id,
        brand: f.brand || "",
        name: f.name || f.id,
        type: f.type || "",
        protein: f.proteinPct,
        absorption,               // midpoint decimal for sorting/UI
        absorptionRange: f.absorption, // keep real range for later
        malted: typeof f.malted === "boolean" ? f.malted : null,
        heat: f.heat || null,
        specs: f.specs || null,
        notes: f.notes || "",
        logo: f.logo || "./icons/db.svg",   // safe default icon
        _raw: f                   // future popover/modal can read this
      };
    });
}