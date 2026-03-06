/* 1c) Imports */
import {
    store
} from "./modules/store.js";
import {
    initAuth,
    openAuthModal,
    refreshAuthUI
} from "./modules/auth.js";
/* 2a) Prefs import */
import { initPrefs } from "./modules/prefs.js";
import {
    initRouter,
    setRoute
} from "./modules/router.js";
import {
    loadIndexes
} from "./modules/loaders.js";
import {
    renderRoute
} from "./modules/ui.js";
import {
    initKB
} from "./modules/kb.js";
// E2a) imports
import {
    buildBakePlanV1
} from "./modules/bakePlan.js";
import {
    ensureQrLib,
    encodePayloadToText,
    renderQr
} from "./modules/qr.js";
import {
    showModal
} from "./modules/modal.js";

/* 2a) DOM */
const dom = {
    navBtns: [...document.querySelectorAll(".navbtn")],
    routeMount: document.getElementById("routeMount"),
    routeTitle: document.getElementById("routeTitle"),
    routeSub: document.getElementById("routeSub"),

    previewCard: document.getElementById("previewCard"),
    btnPreviewQR: document.getElementById("btnPreviewQR"),
    kbCard: document.getElementById("kbCard"),
    btnSwapToKB: document.getElementById("btnSwapToKB"),
    btnBackToPreview: document.getElementById("btnBackToPreview"),
    btnOpenKB: document.getElementById("btnOpenKB"),

    uiModeSeg: document.getElementById("uiModeSeg"),
    btnAuth: document.getElementById("btnAuth"),
    authLabel: document.getElementById("authLabel"),    
};
// 2c) Feature flags
const TEST_ENABLE_QR = true;

// 2d) Placeholder: recipe completeness (wire later)
function isRecipeCompletePlaceholder() {
    return false;
}

/* 2b) Initialize Preferences (global) */
const prefs = initPrefs();

/* 2b) App boot */
(async function boot() {
    // 2b.1 Preferences: UI mode
    const uiMode = store.get("uiMode", "standard");
    document.body.dataset.uimode = uiMode;

    // 2b.2 Load external indexes (templates, DBs, fermentation models, etc.)
    const indexes = await loadIndexes();
	store.set("indexes", indexes);
	window.__PDT_STORE__ = store;
	
	/* 2c) Publish prefs into store for UI/modules */
store.set("prefs", prefs);

/* 2d) Dev sanity check (remove before live) */
console.log("[prefs] ovens:", (prefs.ovens || []).map(o => o.name));

    // 2b.3 Auth (placeholder)
    initAuth();
    refreshAuthUI(dom);

    // 2b.4 KB module
    initKB({
        queryEl: document.getElementById("kbQuery"),
        resultsEl: document.getElementById("kbResults"),
    }, store);

    // 2b.5 Router + initial render
    initRouter({
        onRoute: (route) => {
            highlightNav(route);
            render(route);
        }
    });

    // 2b.6 Wire UI events
    wireUI();

    // E2) Preview QR placeholder gating
    const TEST_ENABLE_QR = true; // testing override (enable anyway)

    function isRecipeCompletePlaceholder() {
        // Later: return store/session engine completeness
        return false;
    }

    function refreshPreviewButtons() {
        const enabled = TEST_ENABLE_QR || isRecipeCompletePlaceholder();

        const btn = dom.btnPreviewQR;
        if (!btn) return;

        btn.toggleAttribute("disabled", !enabled);
        btn.classList.toggle("ghost", true);
        btn.classList.toggle("primary", enabled);
        btn.title = enabled ? "Reminder QR (placeholder)" : "Complete recipe to enable QR";
    }

    dom.btnPreviewQR?.addEventListener("click", () => {
        if (!(TEST_ENABLE_QR || isRecipeCompletePlaceholder())) return;
        // Placeholder behavior for now
        alert("Reminder QR placeholder. Will generate QR when BakePlan logic is finalized.");
    });

    refreshPreviewButtons();

    // E3) Reminder QR wiring
    document.getElementById("btnReminderQR")?.addEventListener("click", async () => {
        // 1) Get bake time (for now, prompt; later use your scheduler UI)
        const bakeAtStr = prompt("Bake date/time (e.g., 2026-03-03 19:30):");
        if (!bakeAtStr) return;

        // Very simple parse (local time). You can replace later.
        const bakeAtMs = Date.parse(bakeAtStr.replace(" ", "T"));
        if (!Number.isFinite(bakeAtMs)) {
            alert("Could not parse date/time. Try: 2026-03-03 19:30");
            return;
        }

        // 2) Timeline spec (placeholder). Replace with your fermentation profile later.
        const timelineSpec = [{
                k: "mix",
                offMin: -420
            },
            {
                k: "ball",
                offMin: -300
            },
            {
                k: "cold",
                offMin: -270
            },
            {
                k: "warm",
                offMin: -120
            },
            {
                k: "bake",
                offMin: 0
            }
        ];

        // 3) Recipe snapshot (placeholder). Replace with engine output later.
        // Keep it minimal and grams-only.
        const recipeSnapshot = {
            u: "g",
            b: 4,
            bw: 556,
            tw: 2223,
            sh: "rect",
            sz: "14x14in",
            tf: 0.100,
            hy: 0.65,
            ing: {
                f: 1326,
                w: 862,
                s: 33,
                y: 1.06,
                o: 26
            },
            pref: "direct"
        };

        const payload = buildBakePlanV1({
            tz: "America/New_York",
            title: "Bake Plan",
            bakeAtMs,
            timelineSpec,
            recipeSnapshot
        });

        const text = encodePayloadToText(payload);

        // 4) Modal UI
        const bodyEl = document.createElement("div");
        bodyEl.innerHTML = `
    <div class="muted" style="margin-bottom:10px;">
      Scan with the Reminder app (later). Includes timing + a simple recipe snapshot.
    </div>
    <div id="qrMount" style="display:grid; place-items:center; padding:10px;"></div>
    <textarea class="input" style="margin-top:10px; min-height:120px; font-family: ui-monospace, monospace;">${text}</textarea>
  `;

        const modal = showModal({
            title: "Reminder QR",
            bodyEl,
            actions: [{
                label: "Copy JSON",
                primary: true,
                onClick: async (ctx) => {
                    try {
                        await navigator.clipboard.writeText(text);
                        ctx.close();
                    } catch (err) {
                        console.error("Clipboard failed:", err);
                    }
                }
            }]
        });

        // 5) Render QR (requires vendor lib)
        try {
            await ensureQrLib({
                src: "./vendor/qrcode.min.js"
            });
            const mountEl = bodyEl.querySelector("#qrMount");
            renderQr({
                mountEl,
                text,
                size: 240
            });
        } catch (e) {
            // If QR lib missing, you still have Copy JSON in the modal
            console.warn(e);
        }
    });

    // 2b.7 Default route
    setRoute("dough");
})();

/* 3a) Rendering */
function render(route) {
    const meta = routeMeta(route);
    dom.routeTitle.textContent = meta.title;
    dom.routeSub.textContent = meta.sub;

    renderRoute({
        route,
        mount: dom.routeMount,
        store,
        onPreview: setPreview,
        onOpenKB: () => swapToKB(true),
    });
}

/* 3b) Preview */
function setPreview(html) {
    const body = document.getElementById("previewBody");
    body.innerHTML = html || `<div class="muted">Preview will appear here.</div>`;
}

/* 4a) Nav highlighting */
function highlightNav(route) {
    dom.navBtns.forEach(b => b.classList.toggle("active", b.dataset.route === route));
}

/* 4b) Route metadata */
function routeMeta(route) {
    const map = {
        dough: {
            title: "Dough",
            sub: "Compute, preview, export."
        },
        templates: {
            title: "Templates",
            sub: "Select a style template. Auto-populate workflow."
        },
        databases: {
            title: "Databases",
            sub: "Flours, salts, yeast types, ovens, etc."
        },
        fermentation: {
            title: "Fermentation",
            sub: "Choose a model. Time + temp + yeast math."
        },
        preferences: {
            title: "Preferences",
            sub: "UI mode, defaults, model selection."
        },
        guides: {
            title: "Guides",
            sub: "How to use the system."
        },
        troubleshooting: {
            title: "Troubleshooting",
            sub: "Symptoms → likely causes → fixes."
        },
        glossary: {
            title: "Glossary",
            sub: "Definitions, terms, processes."
        },
        sauceSource: {
            title: "SauceSource",
            sub: "Placeholder: sauce designer module."
        },
    };
    return map[route] || {
        title: "ProDoughType",
        sub: ""
    };
}

/* 5a) KB / Preview swap */
function swapToKB(open) {
    dom.previewCard.classList.toggle("hidden", open);
    dom.kbCard.classList.toggle("hidden", !open);
}

/* 6a) Wire UI */
function wireUI() {
    // 6a.1 Left nav
    dom.navBtns.forEach(b => {
        b.addEventListener("click", () => setRoute(b.dataset.route));
    });

    // 6a.2 UI mode segmented
    dom.uiModeSeg?.querySelectorAll(".segbtn").forEach(btn => {
        btn.addEventListener("click", () => {
            dom.uiModeSeg.querySelectorAll(".segbtn").forEach(x => x.classList.remove("active"));
            btn.classList.add("active");
            const mode = btn.dataset.uimode;
            store.set("uiMode", mode);
            document.body.dataset.uimode = mode;
        });
    });

    dom.btnAuth?.addEventListener("click", () => openAuthModal());

    // 6a.3 KB swap buttons
    dom.btnSwapToKB.addEventListener("click", () => swapToKB(true));
    dom.btnBackToPreview.addEventListener("click", () => swapToKB(false));
    dom.btnOpenKB.addEventListener("click", () => swapToKB(true));

    if (dom.btnPreviewQR) {
        dom.btnPreviewQR.addEventListener("click", () => {
            if (!(TEST_ENABLE_QR || isRecipeCompletePlaceholder())) return;
            alert("Reminder QR placeholder. Will generate QR when BakePlan logic is finalized.");
        });
    }

    // 6a.4 Auth
    dom.btnAuth.addEventListener("click", () => openAuthModal());
}

/* 7a) Expose minimal helpers if you want them in console */
window.PDT = {
    store,
    setRoute
};