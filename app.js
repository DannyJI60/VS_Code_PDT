import { store } from "./modules/store.js";
import { initAuth, openAuthModal, openProfileModal, refreshAuthUI } from "./modules/auth.js";
import { initPrefs } from "./modules/prefs.js";
import { getRoute, initRouter, setRoute } from "./modules/router.js";
import { loadIndexes } from "./modules/loaders.js";
import * as uiModule from "./modules/ui.js";
import { initKB } from "./modules/kb.js";
import { ensureQrLib, encodePayloadToText, renderQr } from "./modules/qr.js";
import { showModal } from "./modules/modal.js";

const dom = {
  routeLinks: [...document.querySelectorAll(".toolbar-link[data-route-link]")],
  btnHome: document.getElementById("btnHome"),
  btnForum: document.getElementById("btnForum"),
  btnOpenKB: document.getElementById("btnOpenKB"),
  btnPreferences: document.getElementById("btnPreferences"),
  btnExport: document.getElementById("btnExport"),
  btnReminderQR: document.getElementById("btnReminderQR"),
  routeMount: document.getElementById("routeMount"),
  routeTitle: document.getElementById("routeTitle"),
  routeSub: document.getElementById("routeSub"),
  rightPanel: document.querySelector(".rightpanel"),
  previewCard: document.getElementById("previewCard"),
  previewBody: document.getElementById("previewBody"),
  btnPreviewQR: document.getElementById("btnPreviewQR"),
  kbCard: document.getElementById("kbCard"),
  btnSwapToKB: document.getElementById("btnSwapToKB"),
  btnBackToPreview: document.getElementById("btnBackToPreview"),
  sideCard: document.getElementById("sideCard"),
  sideCardTitle: document.getElementById("sideCardTitle"),
  sideCardBody: document.getElementById("sideCardBody"),
  btnBackToRecipe: document.getElementById("btnBackToRecipe"),
  btnAuth: document.getElementById("btnAuth"),
  authLabel: document.getElementById("authLabel"),
  authAvatar: document.getElementById("authAvatar"),
  authImage: document.getElementById("authImage")
};

const prefs = initPrefs();

(async function boot() {
  const uiMode = store.get("uiMode", "standard");
  document.body.dataset.uimode = uiMode;
  document.body.dataset.hideWorkflowModule = "true";

  const indexes = await loadIndexes();
  store.set("indexes", indexes);
  store.set("prefs", prefs);
  window.__PDT_STORE__ = store;
  window.__PDT_FORCE_STARTUP__ = true;

  initAuth();
  refreshAuthUI(dom);

  initKB({
    queryEl: document.getElementById("kbQuery"),
    resultsEl: document.getElementById("kbResults")
  }, store);

  wireUI();
  refreshPreviewButtons();

  initRouter({
    onRoute: (route) => {
      highlightRoute(route);
      render(route);
    }
  });
})();

function render(route) {
  const meta = routeMeta(route);
  dom.routeTitle.textContent = meta.title;
  dom.routeSub.textContent = meta.sub;
  dom.rightPanel?.classList.toggle("hidden", route === "preferences");
  if (route !== "dough" && window.PDT) delete window.PDT.updatePreviewNotes;
  if (route !== "dough") closeSidePanel();

  uiModule.renderRoute({
    route,
    mount: dom.routeMount,
    store,
    onPreview: setPreview,
    onOpenKB: () => swapToKB(true)
  });
}

function setPreview(html) {
  dom.previewBody.innerHTML = html || `<div class="muted">Preview will appear here.</div>`;
  refreshPreviewButtons();
}

function highlightRoute(route) {
  dom.routeLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.routeLink === route);
  });
  dom.btnPreferences?.classList.toggle("active", route === "preferences");
}

function routeMeta(route) {
  const map = {
    dough: { title: "Calculator", sub: "Foundation, fermentation, analysis, and export in one workflow." },
    templates: { title: "Template Browser", sub: "Load a starting workflow from the gallery or from the calculator." },
    databases: { title: "Databases", sub: "Flours, salts, yeast types, ovens, and reference data." },
    fermentation: { title: "Fermentation", sub: "Choose a model. Time, temperature, and yeast math." },
    preferences: { title: "Preferences", sub: "Calculator defaults, startup behavior, ovens, flours, optional ingredients, and data tools." },
    guides: { title: "Guides", sub: "Product walkthroughs and future onboarding content." },
    glossary: { title: "Glossary", sub: "Definitions, terms, and process notes." },
    troubleshooting: { title: "Troubleshooting", sub: "Symptoms, likely causes, and fixes." },
    sauceSource: { title: "SauceSource", sub: "Placeholder: sauce designer module." }
  };
  return map[route] || { title: "ProDoughType", sub: "" };
}

function swapToKB(open) {
  dom.previewCard.classList.toggle("hidden", open);
  dom.kbCard.classList.toggle("hidden", !open);
  dom.sideCard.classList.add("hidden");
  dom.btnOpenKB?.classList.toggle("active", open);
}

function openSidePanel({ title = "Workspace", bodyEl }) {
  dom.sideCardTitle.textContent = title;
  dom.sideCardBody.innerHTML = "";
  if (bodyEl) dom.sideCardBody.appendChild(bodyEl);
  dom.previewCard.classList.add("hidden");
  dom.kbCard.classList.add("hidden");
  dom.sideCard.classList.remove("hidden");
  dom.btnOpenKB?.classList.remove("active");
}

function closeSidePanel() {
  dom.sideCard.classList.add("hidden");
  dom.kbCard.classList.add("hidden");
  dom.previewCard.classList.remove("hidden");
  dom.btnOpenKB?.classList.remove("active");
}

function openSideRoute(route, title) {
  const bodyEl = uiModule.renderSidePanelRoute?.({
    route,
    store,
    onPreview: setPreview,
    onOpenKB: () => swapToKB(true)
  }) || document.createElement("div");
  openSidePanel({ title: title || routeMeta(route).title || "Workspace", bodyEl });
}

function wireUI() {
  dom.btnHome?.addEventListener("click", () => {
    swapToKB(false);
    setRoute("dough");
  });

  dom.routeLinks.forEach((link) => {
    link.addEventListener("click", () => {
      swapToKB(false);
      setRoute(link.dataset.routeLink);
    });
  });

  dom.btnForum?.addEventListener("click", () => {
    openPlaceholderModal("Forum", "The community forum is not enabled yet. This placeholder confirms the toolbar wiring is intact.");
  });

  dom.btnSwapToKB?.addEventListener("click", () => swapToKB(true));
  dom.btnBackToPreview?.addEventListener("click", () => swapToKB(false));
  dom.btnBackToRecipe?.addEventListener("click", () => closeSidePanel());
  dom.btnOpenKB?.addEventListener("click", () => swapToKB(true));
  dom.btnPreferences?.addEventListener("click", () => {
    if (getRoute() === "dough") {
      openSideRoute("preferences", "Preferences");
      return;
    }
    swapToKB(false);
    setRoute("preferences");
  });

  dom.btnAuth?.addEventListener("click", () => {
    const session = store.get("session", null);
    if (session?.token) {
      openProfileModal();
      return;
    }
    openAuthModal();
  });

  dom.btnExport?.addEventListener("click", () => openRecipeExportModal());
  dom.btnPreviewQR?.addEventListener("click", () => openRecipeQrModal());
  dom.btnReminderQR?.addEventListener("click", () => openRecipeQrModal());

  dom.previewBody?.addEventListener("input", (event) => {
    const notesField = event.target.closest("[data-preview-notes]");
    if (!notesField) return;
    window.PDT?.updatePreviewNotes?.(notesField.value || "");
  });

  dom.previewBody?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-preview-action]")?.dataset.previewAction;
    if (!action) return;
    if (action === "copy") copyCurrentRecipe();
    if (action === "download") downloadCurrentRecipe();
    if (action === "qr") openRecipeQrModal();
  });
}

function openPlaceholderModal(title, message) {
  const bodyEl = document.createElement("div");
  bodyEl.innerHTML = `<div class="muted" style="line-height:1.45;">${message}</div>`;
  showModal({ title, bodyEl });
}

function getCurrentRecipe() {
  return store.get("currentRecipe", null);
}

function recipeReady(recipe = getCurrentRecipe()) {
  return Boolean(recipe?.exportPayload && recipe?.copyText);
}

async function copyCurrentRecipe() {
  const recipe = getCurrentRecipe();
  if (!recipeReady(recipe)) {
    openPlaceholderModal("Recipe Not Ready", "Complete the calculator workflow first so the preview has a stable recipe payload.");
    return;
  }

  try {
    await navigator.clipboard.writeText(recipe.copyText);
  } catch {
    openPlaceholderModal("Clipboard Error", "The browser could not write to the clipboard. Use Export File instead.");
  }
}

function downloadCurrentRecipe() {
  const recipe = getCurrentRecipe();
  if (!recipeReady(recipe)) {
    openPlaceholderModal("Recipe Not Ready", "Complete the calculator workflow first so the preview has a stable recipe payload.");
    return;
  }

  const blob = new Blob([JSON.stringify(recipe.exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${recipe.exportPayload.session?.templateId || "prodoughtype_recipe"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openRecipeExportModal() {
  const recipe = getCurrentRecipe();
  if (!recipeReady(recipe)) {
    openPlaceholderModal("Recipe Not Ready", "Complete the calculator workflow first so the preview has a stable recipe payload.");
    return;
  }

  const bodyEl = document.createElement("div");
  bodyEl.innerHTML = `
    <div class="muted" style="line-height:1.45;">
      Export actions stay attached to the current Live Preview recipe. Use copy for a human-readable recipe or file export for a structured importable payload.
    </div>
  `;

  showModal({
    title: "Export Recipe",
    bodyEl,
    actions: [
      { label: "Copy Recipe", primary: true, onClick: async ({ close }) => { await copyCurrentRecipe(); close(); } },
      { label: "Export File", onClick: ({ close }) => { downloadCurrentRecipe(); close(); } },
      { label: "Generate QR", onClick: ({ close }) => { openRecipeQrModal(); close(); } }
    ]
  });
}

async function openRecipeQrModal() {
  const recipe = getCurrentRecipe();
  if (!recipeReady(recipe)) {
    openPlaceholderModal("Recipe Not Ready", "Complete the calculator workflow first so the preview has a stable recipe payload.");
    return;
  }

  const text = encodePayloadToText(recipe.exportPayload);
  const bodyEl = document.createElement("div");
  bodyEl.innerHTML = `
    <div class="muted" style="margin-bottom:10px;">This QR uses the current recipe export payload. If the QR library is unavailable, the JSON text is still shown below.</div>
    <div id="qrMount" style="display:grid; place-items:center; padding:10px 0;"></div>
    <textarea class="input" style="margin-top:10px; min-height:140px; font-family: ui-monospace, monospace;">${text}</textarea>
  `;

  showModal({
    title: "Recipe QR",
    bodyEl,
    actions: [
      {
        label: "Copy JSON",
        primary: true,
        onClick: async ({ close }) => {
          try {
            await navigator.clipboard.writeText(text);
            close();
          } catch {
            close();
          }
        }
      }
    ]
  });

  try {
    await ensureQrLib({ src: "./vendor/qrcode.min.js" });
    renderQr({ mountEl: bodyEl.querySelector("#qrMount"), text, size: 220 });
  } catch {
    // text area remains as fallback when QR library is absent
  }
}

function refreshPreviewButtons() {
  const ready = recipeReady();
  const label = ready ? "Recipe QR" : "Complete recipe to enable QR";
  dom.btnPreviewQR?.toggleAttribute("disabled", !ready);
  dom.btnPreviewQR?.classList.toggle("primary", ready);
  dom.btnPreviewQR?.classList.toggle("ghost", true);
  if (dom.btnPreviewQR) dom.btnPreviewQR.title = label;
  dom.btnExport?.toggleAttribute("disabled", !ready);
  if (dom.btnExport) dom.btnExport.title = ready ? "Export current recipe" : "Complete recipe to enable export";
}

window.PDT = { store, setRoute, openSidePanel, closeSidePanel, openSideRoute };
