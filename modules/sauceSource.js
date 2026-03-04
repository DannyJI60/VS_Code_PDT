export function renderSauceSource() {
  const el = document.createElement("div");
  el.className = "item";
  el.innerHTML = `
    <h4>4a) SauceSource (placeholder)</h4>
    <p class="muted">
      This will become the sauce designer module: style templates, tomato products DB, salt/sugar/oil tuning,
      thickness + reduction targets, and a “match-to-dough” helper.
    </p>
    <div class="item">
      <h4>Planned blocks</h4>
      <p class="muted">• Sauce style template • Tomato base selector • Seasoning ratios • Consistency targets • Export to recipe card</p>
    </div>
  `;
  return el;
}