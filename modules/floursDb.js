/* modules/floursDb.js
   Flour DB loader + UI mapping (safe, minimal)

   Reads store.get("indexes").databases.items for the "flours" dataset entry,
   fetches that JSON file, then returns a list shaped like the current flour
   browser prototype expects.

   Output items:
     { id, brand, name, type, protein, absorption, logo, brandLogo, _raw }

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

const BRAND_LOGOS = Object.freeze({
  "5 Stagioni": "./assets/flour-brands/brand_5_stagioni.svg",
  Caputo: "./assets/flour-brands/brand_caputo.svg",
  "Central Milling": "./assets/flour-brands/brand_central_milling.svg",
  Ceresota: "./assets/flour-brands/brand_ceresota.svg",
  Divella: "./assets/flour-brands/brand_divella.svg",
  "General Mills": "./assets/flour-brands/brand_general_mills.svg",
  GG: "./assets/flour-brands/brand_gg.svg",
  "King Arthur": "./assets/flour-brands/brand_king_arthur.svg",
  "Molino Colombo": "./assets/flour-brands/brand_molino_colombo.svg",
  "Molino Vigevano": "./assets/flour-brands/brand_molino_vigevano.svg",
  Pillsbury: "./assets/flour-brands/brand_pillsbury.svg",
  Polselli: "./assets/flour-brands/brand_polselli.svg"
});

function escapeXml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hashHue(seed) {
  const text = String(seed || "flour");
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function initialsForBrand(brand) {
  const tokens = String(brand || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = tokens.map((t) => t[0].toUpperCase()).join("");
  return initials || "F";
}

function fallbackBrandLogo(brand) {
  const safeBrand = escapeXml(brand || "Flour");
  const initials = escapeXml(initialsForBrand(brand));
  const hue = hashHue(brand);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="40" fill="#121419"/>
  <rect x="40" y="40" width="432" height="432" rx="32" fill="#171a1f" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <rect x="40" y="40" width="432" height="432" rx="32" fill="hsla(${hue}, 72%, 52%, 0.24)"/>
  <circle cx="112" cy="132" r="46" fill="hsla(${hue}, 84%, 58%, 0.34)"/>
  <text x="112" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#f8fafc">${initials}</text>
  <text x="80" y="288" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#f8fafc">${safeBrand}</text>
  <text x="80" y="332" font-family="Arial, sans-serif" font-size="19" font-weight="600" fill="rgba(248,250,252,0.72)">Flour Brand</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveBrandLogo(f) {
  const byBrand = BRAND_LOGOS[f?.brand || ""] || null;
  if (byBrand) return byBrand;
  return fallbackBrandLogo(f?.brand || "");
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
  const prefs = store?.get?.("prefs") || {};
  const custom = Array.isArray(prefs?.flours?.custom) ? prefs.flours.custom : [];
  const combined = [...raw, ...custom];

  return combined
    .filter(
      (f) =>
        typeof f?.proteinPct === "number" &&
        f?.absorption?.minPct != null &&
        f?.absorption?.maxPct != null
    )
    .map((f) => {
      const absorption = midpointPctRangeToDecimal(f.absorption);
      const brandLogo = resolveBrandLogo(f);

      return {
        id: f.id,
        brand: f.brand || "",
        name: f.name || f.id,
        type: f.type || "",
        protein: f.proteinPct,
        absorption,
        absorptionRange: f.absorption,
        malted: typeof f.malted === "boolean" ? f.malted : null,
        heat: f.heat || null,
        specs: f.specs || null,
        notes: f.notes || "",
        brandLogo,
        logo: f.logo || brandLogo,
        _raw: f
      };
    });
}
