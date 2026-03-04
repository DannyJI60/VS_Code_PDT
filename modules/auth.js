/* 2d) Placeholder auth (swap later for real backend) */
import { store } from "./store.js";

export function initAuth() {
  wireModal();
}

export function refreshAuthUI(dom) {
  const session = store.get("session", null);
  const label = session?.user ? session.user : "Login";
  if (dom?.authLabel) dom.authLabel.textContent = label;
}

export function openAuthModal() {
  document.getElementById("authModal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
}

function wireModal() {
  const modal = document.getElementById("authModal");
  const btnClose = document.getElementById("btnCloseAuth");
  const btnLogin = document.getElementById("btnDoLogin");
  const btnLogout = document.getElementById("btnDoLogout");

  btnClose.addEventListener("click", closeAuthModal);

  btnLogin.addEventListener("click", () => {
    const user = document.getElementById("authUser").value.trim() || "user";
    const pass = document.getElementById("authPass").value.trim() || "pass";
    // placeholder token
    store.set("session", { user, token: btoa(`${user}:${pass}:${Date.now()}`) });
    closeAuthModal();
    location.reload();
  });

  btnLogout.addEventListener("click", () => {
    store.del("session");
    closeAuthModal();
    location.reload();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAuthModal();
  });
}