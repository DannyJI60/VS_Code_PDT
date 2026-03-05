/* 2b) Hash router */
let onRouteCb = null;

export function initRouter({ onRoute }) {
  onRouteCb = onRoute;
  window.addEventListener("hashchange", () => onRouteCb?.(getRoute()));
}

export function setRoute(route) {
  location.hash = `#/${route}`;
}

export function getRoute() {
  const h = location.hash || "#/dough";
  const m = h.match(/^#\/([^?]+)/);
  return (m && m[1]) ? m[1] : "dough";
}