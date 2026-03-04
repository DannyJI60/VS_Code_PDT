// D1) /modules/modal.js
export function showModal({ title, bodyEl, actions = [] }) {
  const overlay = document.createElement("div");
  overlay.className = "modal";

  const box = document.createElement("div");
  box.className = "modalbox";

  const head = document.createElement("div");
  head.className = "modalhead";

  const t = document.createElement("div");
  t.className = "modaltitle";
  t.textContent = title || "Modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn ghost sm";
  closeBtn.textContent = "Close";

  head.appendChild(t);
  head.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "modalbody";
  body.appendChild(bodyEl);

  const foot = document.createElement("div");
  foot.style.display = "flex";
  foot.style.justifyContent = "flex-end";
  foot.style.gap = "10px";
  foot.style.marginTop = "12px";

  actions.forEach(a => {
    const b = document.createElement("button");
    b.className = a.primary ? "btn primary" : "btn ghost";
    b.textContent = a.label;
    b.addEventListener("click", () => a.onClick?.({ close }));
    foot.appendChild(b);
  });

  body.appendChild(foot);

  box.appendChild(head);
  box.appendChild(body);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  return { close };
}