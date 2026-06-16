import { el, clear, pageHead, card, stat, progressBar, button } from "../ui.js";
import { load } from "../store.js";
import { usd, pct } from "../format.js";
import { toMonthly } from "../lib/finance.js";

const sum = (items, f = (i) => +i.value || 0) => (items || []).reduce((t, i) => t + f(i), 0);

export default function render(root, { go }) {
  const nw = load("networth", { assets: [], liabilities: [], history: [] });
  const cf = load("cashflow", { income: [], expenses: [] });
  const sv = load("savings", { goals: [] });

  const assets = sum(nw.assets), liab = sum(nw.liabilities);
  const netWorth = assets - liab;
  const income = sum(cf.income, (i) => toMonthly(+i.amount || 0, i.frequency));
  const expenses = sum(cf.expenses, (i) => toMonthly(+i.amount || 0, i.frequency));
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const goalTarget = sum(sv.goals, (g) => +g.target || 0);
  const goalSaved = sum(sv.goals, (g) => +g.saved || 0);
  const goalFrac = goalTarget > 0 ? goalSaved / goalTarget : 0;

  const hasData = nw.assets.length || nw.liabilities.length || cf.income.length || cf.expenses.length || sv.goals.length;

  root.append(
    pageHead("Dashboard", "Your financial picture at a glance."),
    !hasData && welcomeCard(go),
    el("div.grid.grid-3", {},
      tile("Net Worth", usd(netWorth), netWorth >= 0 ? "pos" : "neg",
        nw.assets.length || nw.liabilities.length ? `${usd(assets)} assets · ${usd(liab)} debts` : "Add assets to begin", "/net-worth", go),
      tile("Monthly Cash Flow", usd(net), net >= 0 ? "pos" : "neg",
        income ? `${usd(income)} in · ${usd(expenses)} out` : "Add income & expenses", "/cash-flow", go),
      tile("Savings Rate", income ? pct(savingsRate, 0) : "—", null,
        income ? "of income saved each month" : "Set up cash flow first", "/cash-flow", go),
    ),
    el("div.grid.grid-2", { style: "margin-top:18px" },
      goalsCard(sv, goalSaved, goalTarget, goalFrac, go),
      quickCard(go),
    ),
  );
}

function tile(label, value, tone, sub, path, go) {
  const c = card(stat(label, value, { sub, tone }));
  c.style.cursor = "pointer";
  c.addEventListener("click", () => go(path));
  return c;
}

function goalsCard(sv, saved, target, frac, go) {
  const c = card(el("div.spread", {}, el("h2", {}, "Savings Goals"), button("Manage", () => go("/savings-goals"), "ghost btn-sm")));
  if (!sv.goals.length) {
    c.append(el("p.muted.small", { style: "margin-top:10px" }, "No goals yet. Set a target to start tracking."));
    return c;
  }
  c.append(
    el("div.spread.small.muted", { style: "margin:12px 0 6px" },
      el("span", {}, `${usd(saved)} of ${usd(target)}`), el("span", {}, pct(frac * 100, 0))),
    progressBar(frac, frac >= 1),
    el("div.list", { style: "margin-top:14px" },
      ...sv.goals.slice(0, 4).map((g) => {
        const f = g.target > 0 ? g.saved / g.target : 0;
        return el("div", {},
          el("div.spread.small", {}, el("span", {}, g.name || "Goal"), el("span.muted", {}, pct(f * 100, 0))),
          progressBar(f, f >= 1));
      }),
    ),
  );
  return c;
}

function quickCard(go) {
  const links = [
    ["💵", "Paycheck Calculator", "/paycheck"],
    ["💳", "Debt Payoff Planner", "/debt"],
    ["📋", "Budget vs. Actual", "/budget"],
    ["🔥", "FIRE Tracker", "/fire"],
    ["⚖️", "Roth vs Traditional", "/roth-vs-traditional"],
    ["💾", "Backup & Restore", "/settings"],
  ];
  return card(
    el("h2", {}, "Tools"),
    el("p.card-sub", {}, "Jump into a calculator."),
    el("div.list", {},
      ...links.map(([ico, label, path]) =>
        el("div.line-item", { style: "cursor:pointer;grid-template-columns:auto 1fr auto", onClick: () => go(path) },
          el("span", { style: "font-size:18px" }, ico),
          el("div.li-name", {}, label),
          el("span.muted", {}, "→"))),
    ),
  );
}

function welcomeCard(go) {
  return card(
    el("h2", {}, "👋 Welcome to Ledgerline"),
    el("p.card-sub", {}, "A private personal-finance workspace. Nothing leaves your browser — all data is stored locally on this device."),
    el("div.row", {},
      button("Track net worth", () => go("/net-worth")),
      button("Map cash flow", () => go("/cash-flow"), "secondary"),
      button("Set a savings goal", () => go("/savings-goals"), "secondary"),
    ),
  );
}
