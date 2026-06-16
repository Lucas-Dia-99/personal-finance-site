import { clear } from "./ui.js";
import dashboard from "./views/dashboard.js";
import netWorth from "./views/networth.js";
import paycheck from "./views/paycheck.js";
import retirement from "./views/retirement.js";
import cashflow from "./views/cashflow.js";
import contrib401k from "./views/contribution401k.js";
import savings from "./views/savings.js";

const ROUTES = [
  { path: "/dashboard", icon: "🏠", title: "Dashboard", render: dashboard },
  { path: "/net-worth", icon: "📊", title: "Net Worth", render: netWorth },
  { path: "/cash-flow", icon: "🔄", title: "Cash Flow", render: cashflow },
  { path: "/paycheck", icon: "💵", title: "Paycheck", render: paycheck },
  { path: "/contribution-401k", icon: "🏦", title: "401(k) Impact", render: contrib401k },
  { path: "/retirement", icon: "🌴", title: "Retirement", render: retirement },
  { path: "/savings-goals", icon: "🎯", title: "Savings Goals", render: savings },
];

const viewEl = document.getElementById("view");
const navEl = document.getElementById("nav");
const sidebar = document.getElementById("sidebar");

// Build nav once.
for (const r of ROUTES) {
  const a = document.createElement("a");
  a.href = "#" + r.path;
  a.dataset.path = r.path;
  a.innerHTML = `<span class="nav-ico">${r.icon}</span><span>${r.title}</span>`;
  a.addEventListener("click", () => sidebar.classList.remove("open"));
  navEl.appendChild(a);
}

function currentPath() {
  const p = location.hash.replace(/^#/, "");
  return ROUTES.some((r) => r.path === p) ? p : "/dashboard";
}

function router() {
  const path = currentPath();
  const route = ROUTES.find((r) => r.path === path);
  navEl.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.path === path));
  clear(viewEl);
  route.render(viewEl, { go: (p) => (location.hash = p) });
  viewEl.focus({ preventScroll: true });
  viewEl.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);

// Theme handling.
const THEME_KEY = "ll:theme";
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
}
const saved = localStorage.getItem(THEME_KEY) ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
applyTheme(saved);
document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

// Mobile menu.
document.getElementById("menuToggle").addEventListener("click", () => sidebar.classList.toggle("open"));

if (!location.hash) location.hash = "/dashboard";
router();
