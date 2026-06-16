import { clear } from "./ui.js";
import dashboard from "./views/dashboard.js";
import netWorth from "./views/networth.js";
import paycheck from "./views/paycheck.js";
import retirement from "./views/retirement.js";
import cashflow from "./views/cashflow.js";
import contrib401k from "./views/contribution401k.js";
import savings from "./views/savings.js";
import budget from "./views/budget.js";
import debt from "./views/debt.js";
import rothvstrad from "./views/rothvstrad.js";
import fire from "./views/fire.js";
import settings from "./views/settings.js";
import profile from "./views/profile.js";
import mortgage from "./views/mortgage.js";
import affordability from "./views/affordability.js";
import rentvsbuy from "./views/rentvsbuy.js";
import emergency from "./views/emergency.js";
import investment from "./views/investment.js";

const ROUTES = [
  { path: "/dashboard", icon: "🏠", title: "Dashboard", render: dashboard, group: "Overview" },
  { path: "/profile", icon: "👤", title: "Profile", render: profile, group: "Overview" },
  { path: "/net-worth", icon: "📊", title: "Net Worth", render: netWorth, group: "Track" },
  { path: "/cash-flow", icon: "🔄", title: "Cash Flow", render: cashflow, group: "Track" },
  { path: "/budget", icon: "📋", title: "Budget", render: budget, group: "Track" },
  { path: "/savings-goals", icon: "🎯", title: "Savings Goals", render: savings, group: "Plan" },
  { path: "/emergency-fund", icon: "🛟", title: "Emergency Fund", render: emergency, group: "Plan" },
  { path: "/debt", icon: "💳", title: "Debt Payoff", render: debt, group: "Plan" },
  { path: "/retirement", icon: "🌴", title: "Retirement", render: retirement, group: "Plan" },
  { path: "/fire", icon: "🔥", title: "FIRE", render: fire, group: "Plan" },
  { path: "/paycheck", icon: "💵", title: "Paycheck", render: paycheck, group: "Paychecks" },
  { path: "/contribution-401k", icon: "🏦", title: "401(k) Impact", render: contrib401k, group: "Paychecks" },
  { path: "/roth-vs-traditional", icon: "⚖️", title: "Roth vs Traditional", render: rothvstrad, group: "Paychecks" },
  { path: "/mortgage", icon: "🏡", title: "Mortgage", render: mortgage, group: "Calculators" },
  { path: "/affordability", icon: "🔑", title: "Affordability", render: affordability, group: "Calculators" },
  { path: "/rent-vs-buy", icon: "⚖️", title: "Rent vs Buy", render: rentvsbuy, group: "Calculators" },
  { path: "/investment", icon: "📈", title: "Investment", render: investment, group: "Calculators" },
  { path: "/settings", icon: "💾", title: "Data & Backup", render: settings, group: "Data" },
];

const viewEl = document.getElementById("view");
const navEl = document.getElementById("nav");
const sidebar = document.getElementById("sidebar");

// Build nav once, with group headers.
let lastGroup = null;
for (const r of ROUTES) {
  if (r.group !== lastGroup) {
    const h = document.createElement("p");
    h.className = "nav-group";
    h.textContent = r.group;
    navEl.appendChild(h);
    lastGroup = r.group;
  }
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
