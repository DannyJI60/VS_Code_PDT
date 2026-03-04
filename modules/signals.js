// C1) /modules/signals.js
// Placeholder signal + popup system (no real logic yet).

let activePop = null;

export function getPlaceholderSignals(session) {
  // Return signal objects keyed by field id.
  // severity: "g" | "a" | "r" | "gray"
  // title/snippet: short
  // kbQuery: what we would search in KB (placeholder)
  return {
    hydration: {
      severity: "a",
      title: "Hydration signal (placeholder)",
      snippet: "Hydration interacts with flour strength, fermentation, and bake conditions. This is a placeholder snippet.",
      kbQuery: "hydration dough feel fermentation",
      kbId: null
    },
    tf: {
      severity: "gray",
      title: "TF signal (placeholder)",
      snippet: "TF affects thickness, bake time sensitivity, and crispness. Placeholder until rule set is finalized.",
      kbQuery: "thickness factor TF",
      kbId: null
    },
    preferment: {
      severity: "gray",
      title: "Preferment signal (placeholder)",
      snippet: "Preferment changes flavor and dough handling by shifting fermentation load. Placeholder snippet.",
      kbQuery: "preferment biga poolish sourdough",
      kbId: null
    }
  };
}

export function showSnippetPopup({ anchorEl, title, snippet, onDeepDive }) {
  hideSnippetPopup();

  const rect = anchorEl.getBoundingClientRect();

  const pop = document.createElement("div");
  pop.className = "pop";
  pop.innerHTML = `
    <h4>${esc(title || "Info")}</h4>
    <p>${esc(snippet || "")}</p>
    <div class="poprow">
      <a href="#" data-deep>Deep dive</a>
      <button class="btn ghost sm" data-close>Close</button>
    </div>
  `;

  document.body.appendChild(pop);

  // Position near anchor (right panel safe-ish)
  const pad = 10;
  const top = Math.min(window.innerHeight - pop.offsetHeight - pad, rect.bottom + 8);
  const left = Math.min(window.innerWidth - pop.offsetWidth - pad, rect.left);
  pop.style.top = `${Math.max(pad, top)}px`;
  pop.style.left = `${Math.max(pad, left)}px`;

  pop.querySelector("[data-close]").addEventListener("click", (e) => {
    e.preventDefault();
    hideSnippetPopup();
  });

  pop.querySelector("[data-deep]").addEventListener("click", (e) => {
    e.preventDefault();
    hideSnippetPopup();
    onDeepDive?.();
  });

  // click-outside to close
  setTimeout(() => {
    const onDoc = (e) => {
      if (!pop.contains(e.target)) hideSnippetPopup();
    };
    document.addEventListener("mousedown", onDoc, { once: true });
  }, 0);

  activePop = pop;
}

export function hideSnippetPopup() {
  if (activePop) activePop.remove();
  activePop = null;
}

function esc(s){
  return String(s||"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}