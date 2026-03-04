/* 2a) Simple store wrapper */
export const store = {
  get(k, fallback=null) {
    try {
      const v = localStorage.getItem(`pdt_${k}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, value) {
    localStorage.setItem(`pdt_${k}`, JSON.stringify(value));
  },
  del(k) {
    localStorage.removeItem(`pdt_${k}`);
  }
};