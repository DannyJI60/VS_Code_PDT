import { store } from "./store.js";

let authDomRef = null;

export function initAuth() {
  wireModal();
}

export function refreshAuthUI(dom) {
  if (dom) authDomRef = dom;

  const session = getSession();
  const isLoggedIn = !!session;
  const label = isLoggedIn ? session.profile.username : "Login";

  if (authDomRef?.authLabel) authDomRef.authLabel.textContent = label;
  authDomRef?.btnAuth?.classList.toggle("is-authenticated", isLoggedIn);

  if (!authDomRef?.authAvatar || !authDomRef?.authImage) return;

  if (!isLoggedIn) {
    authDomRef.authAvatar.classList.add("hidden");
    authDomRef.authImage.classList.add("hidden");
    authDomRef.authImage.removeAttribute("src");
    return;
  }

  const avatarUrl = String(session.profile.avatarUrl || "").trim();
  if (avatarUrl) {
    authDomRef.authImage.src = avatarUrl;
    authDomRef.authImage.classList.remove("hidden");
    authDomRef.authAvatar.classList.add("hidden");
  } else {
    authDomRef.authAvatar.textContent = initialsFor(session.profile.username);
    authDomRef.authAvatar.classList.remove("hidden");
    authDomRef.authImage.classList.add("hidden");
    authDomRef.authImage.removeAttribute("src");
  }
}

export function openAuthModal() {
  document.getElementById("authModal")?.classList.remove("hidden");
}

export function openProfileModal() {
  const session = getSession();
  if (!session) {
    openAuthModal();
    return;
  }

  document.getElementById("profileUsername").value = session.profile.username || "";
  document.getElementById("profileEmail").value = session.profile.email || "";
  document.getElementById("profileAvatarUrl").value = session.profile.avatarUrl || "";
  document.getElementById("profileFavoritePizza").value = session.profile.favoritePizza || "";
  document.getElementById("profileSubscriber").checked = !!session.profile.isSubscriber;
  document.getElementById("profileModal")?.classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("authModal")?.classList.add("hidden");
}

function closeProfileModal() {
  document.getElementById("profileModal")?.classList.add("hidden");
}

function wireModal() {
  const authModal = document.getElementById("authModal");
  const profileModal = document.getElementById("profileModal");
  const btnCloseAuth = document.getElementById("btnCloseAuth");
  const btnLogin = document.getElementById("btnDoLogin");
  const btnCloseProfile = document.getElementById("btnCloseProfile");
  const btnSaveProfile = document.getElementById("btnSaveProfile");
  const btnProfileLogout = document.getElementById("btnProfileLogout");

  btnCloseAuth?.addEventListener("click", closeAuthModal);
  btnCloseProfile?.addEventListener("click", closeProfileModal);

  btnLogin?.addEventListener("click", () => {
    const username = document.getElementById("authUser").value.trim() || "user";
    const password = document.getElementById("authPass").value.trim() || "pass";
    const session = {
      user: username,
      token: btoa(`${username}:${password}:${Date.now()}`),
      profile: {
        username,
        email: "",
        avatarUrl: "",
        favoritePizza: "",
        isSubscriber: false
      }
    };

    store.set("session", session);
    closeAuthModal();
    refreshAuthUI(authDomRef);
  });

  btnSaveProfile?.addEventListener("click", () => {
    const session = getSession();
    if (!session) return;

    const nextSession = {
      ...session,
      user: document.getElementById("profileUsername").value.trim() || session.user,
      profile: {
        ...session.profile,
        username: document.getElementById("profileUsername").value.trim() || session.profile.username,
        email: document.getElementById("profileEmail").value.trim(),
        avatarUrl: document.getElementById("profileAvatarUrl").value.trim(),
        favoritePizza: document.getElementById("profileFavoritePizza").value.trim(),
        isSubscriber: document.getElementById("profileSubscriber").checked
      }
    };

    store.set("session", nextSession);
    closeProfileModal();
    refreshAuthUI(authDomRef);
  });

  btnProfileLogout?.addEventListener("click", logout);

  authModal?.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  profileModal?.addEventListener("click", (e) => {
    if (e.target === profileModal) closeProfileModal();
  });
}

function logout() {
  store.del("session");
  closeAuthModal();
  closeProfileModal();
  refreshAuthUI(authDomRef);
}

function getSession() {
  const raw = store.get("session", null);
  if (!raw?.token) return null;

  const profile = raw.profile || {};
  const username = profile.username || raw.user || "user";

  return {
    ...raw,
    user: username,
    profile: {
      username,
      email: profile.email || "",
      avatarUrl: profile.avatarUrl || "",
      favoritePizza: profile.favoritePizza || "",
      isSubscriber: !!profile.isSubscriber
    }
  };
}

function initialsFor(name) {
  const tokens = String(name || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = tokens.map((token) => token[0].toUpperCase()).join("");
  return initials || "P";
}