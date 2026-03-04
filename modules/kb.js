/* 2e) KB search against imported indexes (placeholder data until your real KB is wired) */
export function initKB({ queryEl, resultsEl }, store) {
  if (!queryEl || !resultsEl) return;

  const idx = store.get("indexes", null);
  const items = normalizeKB(idx);

  function render(list) {
    resultsEl.innerHTML = list.map(x => `
      <div class="item">
        <h4>${esc(x.title)}</h4>
        <p>${esc(x.summary)}</p>
      </div>
    `).join("");
  }

  function search(q) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return items.slice(0, 25);
    return items.filter(x =>
      x.title.toLowerCase().includes(s) || x.summary.toLowerCase().includes(s)
    ).slice(0, 50);
  }

  queryEl.addEventListener("input", () => render(search(queryEl.value)));
  render(search(""));
}

function normalizeKB(idx) {
  const t = idx?.troubleshooting?.items || [];
  const g = idx?.glossary?.items || [];

  const base = [
    ...t.map(x => ({ title: x.title || "Troubleshooting", summary: x.summary || "" })),
    ...g.map(x => ({ title: x.term || "Glossary", summary: x.definition || "" })),
  ];

  if (base.length) return base;

  return [
    { title: "Sticky dough", summary: "Hydration too high, dough too warm, underdeveloped gluten, or over-fermented." },
    { title: "Slack dough", summary: "Too much fermentation, too warm, or flour strength too low for the timeline." }
  ];
}

function esc(s){
  return String(s||"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}