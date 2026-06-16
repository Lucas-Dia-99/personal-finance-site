// Minimal dependency-free SVG charts. Colors come from CSS classes.
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

const niceMax = (v) => {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / mag;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * mag;
};

const fmtAxis = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
  if (a >= 1e3) return "$" + Math.round(v / 1e3) + "k";
  return "$" + Math.round(v);
};

const W = 640, H = 260, P = { t: 16, r: 16, b: 28, l: 52 };

// data: [{ label, value }]
export function lineChart(data) {
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", preserveAspectRatio: "xMidYMid meet" });
  if (!data.length) return svg;
  const innerW = W - P.l - P.r, innerH = H - P.t - P.b;
  const maxV = niceMax(Math.max(...data.map((d) => d.value), 0));
  const minV = Math.min(0, ...data.map((d) => d.value));
  const range = maxV - minV || 1;
  const x = (i) => P.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => P.t + innerH - ((v - minV) / range) * innerH;

  for (let g = 0; g <= 4; g++) {
    const v = minV + (range * g) / 4;
    const yy = y(v);
    svg.appendChild(svgEl("line", { class: "grid-line", x1: P.l, x2: W - P.r, y1: yy, y2: yy }));
    const t = svgEl("text", { class: "lbl", x: P.l - 8, y: yy + 4, "text-anchor": "end" });
    t.textContent = fmtAxis(v);
    svg.appendChild(t);
  }

  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const linePath = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const areaPath = linePath + ` L${pts[pts.length - 1][0]} ${y(minV)} L${pts[0][0]} ${y(minV)} Z`;
  svg.appendChild(svgEl("path", { class: "area", d: areaPath }));
  svg.appendChild(svgEl("path", { class: "line", d: linePath }));

  const stepLbl = Math.ceil(data.length / 7);
  data.forEach((d, i) => {
    if (data.length <= 16) svg.appendChild(svgEl("circle", { class: "dot", cx: x(i), cy: y(d.value), r: 3.5 }));
    if (i % stepLbl === 0 || i === data.length - 1) {
      const t = svgEl("text", { class: "lbl", x: x(i), y: H - 8, "text-anchor": "middle" });
      t.textContent = d.label;
      svg.appendChild(t);
    }
  });
  return svg;
}

// data: [{ label, value }]
export function barChart(data) {
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", preserveAspectRatio: "xMidYMid meet" });
  if (!data.length) return svg;
  const innerW = W - P.l - P.r, innerH = H - P.t - P.b;
  const maxV = niceMax(Math.max(...data.map((d) => d.value), 0));
  const y = (v) => P.t + innerH - (v / maxV) * innerH;

  for (let g = 0; g <= 4; g++) {
    const v = (maxV * g) / 4, yy = y(v);
    svg.appendChild(svgEl("line", { class: "grid-line", x1: P.l, x2: W - P.r, y1: yy, y2: yy }));
    const t = svgEl("text", { class: "lbl", x: P.l - 8, y: yy + 4, "text-anchor": "end" });
    t.textContent = fmtAxis(v);
    svg.appendChild(t);
  }

  const band = innerW / data.length;
  const bw = Math.min(48, band * 0.62);
  data.forEach((d, i) => {
    const cx = P.l + band * i + band / 2;
    const yy = y(d.value);
    svg.appendChild(svgEl("rect", { class: "bar", x: cx - bw / 2, y: yy, width: bw, height: P.t + innerH - yy, rx: 4 }));
    const t = svgEl("text", { class: "lbl", x: cx, y: H - 8, "text-anchor": "middle" });
    t.textContent = d.label;
    svg.appendChild(t);
  });
  return svg;
}

const PIE_COLORS = ["#2563eb", "#7c3aed", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#db2777", "#65a30d", "#9333ea", "#0d9488", "#ea580c", "#64748b"];

// Donut chart. data: [{ label, value }]. Returns a wrapper with svg + legend.
export function donutChart(data) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:20px;align-items:center;flex-wrap:wrap";
  const total = data.reduce((t, d) => t + Math.max(0, d.value), 0);
  const size = 200, cx = size / 2, cy = size / 2, rOuter = 92, rInner = 56;
  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, style: "flex:0 0 auto" });

  if (total <= 0) {
    svg.appendChild(svgEl("circle", { cx, cy, r: rOuter, fill: "var(--surface-2)" }));
  } else {
    let angle = -Math.PI / 2;
    data.forEach((d, i) => {
      const frac = Math.max(0, d.value) / total;
      if (frac <= 0) return;
      const end = angle + frac * 2 * Math.PI;
      const large = frac > 0.5 ? 1 : 0;
      const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x1, y1] = p(rOuter, angle), [x2, y2] = p(rOuter, end);
      const [x3, y3] = p(rInner, end), [x4, y4] = p(rInner, angle);
      const path = svgEl("path", {
        d: `M${x1} ${y1} A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      });
      svg.appendChild(path);
      angle = end;
    });
  }

  const legend = document.createElement("div");
  legend.className = "legend";
  legend.style.cssText = "flex-direction:column;gap:7px";
  data.forEach((d, i) => {
    const pctTxt = total > 0 ? Math.round((d.value / total) * 100) + "%" : "0%";
    const row = document.createElement("span");
    row.style.color = "var(--text)";
    row.innerHTML = `<span style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>${d.label} · <span style="color:var(--muted)">${pctTxt}</span>`;
    legend.appendChild(row);
  });
  wrap.append(svg, legend);
  return wrap;
}
