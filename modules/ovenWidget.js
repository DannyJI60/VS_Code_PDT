/* =========================================================
   2) Oven Widget (Foundation plug-in)
   - Reads ovens from prefs
   - Writes selected ovenId into session
   - Applies max-size constraints (subtle/hard/off)
   - UI is compact "context row"
   ========================================================= */

/* 2a) Public API */
export function mountOvenWidget({
  mountEl,
  prefs,
  session,
  onSessionChange,
  onOpenPrefs
}) {
  if (!mountEl) return;

  // 2a.1) Feature gate (easy to disable later)
  if (!isEnabled(prefs)) {
    mountEl.innerHTML = "";
    return;
  }

  const ovens = Array.isArray(prefs?.ovens) ? prefs.ovens : [];

  // 2a.2) Empty state if no ovens exist
  if (ovens.length === 0) {
    mountEl.innerHTML = `
      <div class="field" style="padding:10px;">
        <div class="fieldtop">
          <div class="fieldlbl">
            <span>Oven</span>
            <span class="muted" style="font-size:12px;">(optional)</span>
          </div>
        </div>
        <div class="muted" style="font-size:12px;">
          No ovens saved. Add one in Preferences.
        </div>
        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
          <button class="btn ghost sm" data-openprefs>Open Preferences</button>
        </div>
      </div>
    `;

    mountEl.querySelector("[data-openprefs]")?.addEventListener("click", () => {
      onOpenPrefs?.();
    });
    return;
  }

  // 2a.3) Ensure session has an ovenId
  if (!session.ovenId) {
    session.ovenId = prefs.defaultOvenId || ovens[0].id;
    onSessionChange?.(session);
  }

  const selected = ovens.find(o => o.id === session.ovenId) || ovens[0];

  // 2a.4) Render compact context row
  mountEl.innerHTML = `
    <div class="field" style="padding:10px;">
      <div class="fieldtop">
        <div class="fieldlbl">
          <span>Oven</span>
          <span class="muted" style="font-size:12px;">(context)</span>
        </div>
        <div class="muted" style="font-size:12px;" data-maxhint></div>
      </div>

      <div class="fieldrow" style="justify-content:space-between;">
        <div style="display:flex; gap:10px; align-items:center; flex:1;">
          <select class="input" data-ovensel style="max-width:340px; width:100%;">
            ${ovens.map(o => `
              <option value="${escAttr(o.id)}" ${o.id === selected.id ? "selected" : ""}>
                ${escHtml(o.name || o.id)}
              </option>
            `).join("")}
          </select>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn ghost sm" data-openprefs title="Edit ovens in Preferences">Prefs</button>
        </div>
      </div>

      <div class="muted" style="font-size:11px; margin-top:8px;">
        Uses max size for convenience (no bake advice). Can be disabled in Preferences later.
      </div>
    </div>
  `;

  const maxHintEl = mountEl.querySelector("[data-maxhint]");
  const selEl = mountEl.querySelector("[data-ovensel]");

  updateMaxHint(maxHintEl, selected);

  // 2a.5) Wire select → session + constraint application
  selEl?.addEventListener("change", () => {
    const newId = selEl.value;
    const oven = ovens.find(o => o.id === newId);
    if (!oven) return;

    session.ovenId = newId;

    // Apply constraints (subtle/hard) if enabled
    const changed = applyOvenConstraints({ prefs, oven, session });

    onSessionChange?.(session, { ovenApplied: changed, oven });
    updateMaxHint(maxHintEl, oven);
  });

  // 2a.6) Prefs button
  mountEl.querySelector("[data-openprefs]")?.addEventListener("click", () => {
    onOpenPrefs?.();
  });
}

/* =========================================================
   2b) Constraint application (geometry only)
   - For this iteration: round max only (maxRoundIn)
   - Rect can be added later (maxRectWIn/maxRectLIn)
   ========================================================= */

export function applyOvenConstraints({ prefs, oven, session }) {
  const mode = prefs?.ovenConstraints?.mode || "subtle"; // off | subtle | hard
  if (mode === "off") return false;

  let changed = false;

  // 2b.1) Round size constraint
  if (session.shape === "round" && oven?.maxRoundIn) {
    const max = Number(oven.maxRoundIn);
    const d = Number(session.diameterIn || 0);

    if (mode === "hard") {
      if (d > max) {
        session.diameterIn = max;
        changed = true;
      }
    } else {
      // subtle: only if blank or too big
      if (!d || d > max) {
        session.diameterIn = max;
        changed = true;
      }
    }
  }

  return changed;
}

/* =========================================================
   2c) Helpers / gates
   ========================================================= */

function isEnabled(prefs) {
  return (prefs?.ovenConstraints?.mode || "subtle") !== "off";
}

function updateMaxHint(el, oven) {
  if (!el) return;
  const max = oven?.maxRoundIn ? `${oven.maxRoundIn}″ max` : "";
  el.textContent = max;
}

function escHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function escAttr(s) {
  return String(s || "").replace(/"/g, "&quot;");
}