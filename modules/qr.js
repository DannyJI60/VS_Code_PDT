// C1) /modules/qr.js
// Thin wrapper: given a payload object, render QR into a DOM element.
// Requires a QR library that exposes `QRCode` globally (qrcodejs-style).

let qrLibLoaded = false;

export async function ensureQrLib({ src = "./vendor/qrcode.min.js" } = {}) {
  if (qrLibLoaded) return;
  await loadScript(src);
  if (!window.QRCode) throw new Error("QR library not found. Expected global QRCode.");
  qrLibLoaded = true;
}

export function encodePayloadToText(payload) {
  // Plain JSON for v1 (reliable, readable). Keep keys short in the payload itself.
  return JSON.stringify(payload);
}

export function renderQr({ mountEl, text, size = 220 }) {
  if (!mountEl) throw new Error("renderQr: mountEl required");
  if (!window.QRCode) throw new Error("renderQr: QRCode missing (did you call ensureQrLib?)");

  mountEl.innerHTML = "";
  // eslint-disable-next-line no-new
  new window.QRCode(mountEl, {
    text,
    width: size,
    height: size,
    correctLevel: window.QRCode.CorrectLevel.M
  });
}

// C2) loader
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}