// Formatting helpers shared across views.
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const usdCentsFmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function usd(n, { cents = false } = {}) {
  if (!isFinite(n)) n = 0;
  return cents ? usdCentsFmt.format(n) : usdFmt.format(n);
}

// Signed currency, e.g. "+$1,200" / "-$340".
export function usdSigned(n) {
  const s = usd(Math.abs(n));
  return (n < 0 ? "−" : "+") + s;
}

export function pct(n, digits = 1) {
  if (!isFinite(n)) n = 0;
  return n.toFixed(digits) + "%";
}

export function num(n) {
  return numFmt.format(n || 0);
}

// Parse a number out of a possibly-formatted input string.
export function parseNum(v) {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
