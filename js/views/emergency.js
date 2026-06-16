import { el, clear, pageHead, card, stat, field, moneyInput, select, progressBar, button } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { toMonthly, monthsToTarget } from "../lib/finance.js";

const KEY = "emergency";

function seed() {
  const cf = load("cashflow", { expenses: [] });
  const nw = load("networth", { assets: [] });
  const monthlyExpenses = cf.expenses.reduce((t, e) => t + toMonthly(+e.amount || 0, e.frequency), 0);
  const cash = nw.assets.filter((a) => ["Cash", "Checking", "Savings"].includes(a.category)).reduce((t, a) => t + (+a.value || 0), 0);
  return {
    monthlyExpenses: Math.round(monthlyExpenses) || 3500,
    currentSavings: Math.round(cash) || 5000,
    targetMonths: 6,
    monthlyContribution: 300,
  };
}

const MONTH_OPTS = [["3", "3 months (lean)"], ["6", "6 months (standard)"], ["9", "9 months"], ["12", "12 months (cautious)"]];

export default function render(root) {
  const data = load(KEY, null) || save(KEY, seed());
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const target = data.monthlyExpenses * data.targetMonths;
    const monthsCovered = data.monthlyExpenses > 0 ? data.currentSavings / data.monthlyExpenses : 0;
    const gap = Math.max(0, target - data.currentSavings);
    const frac = target > 0 ? data.currentSavings / target : 0;
    const monthsToFull = gap > 0 ? monthsToTarget(target, data.currentSavings, data.monthlyContribution) : 0;
    const funded = frac >= 1;

    root.append(
      pageHead("Emergency Fund", "How many months of expenses you've got covered — and how to close the gap."),
      el("div.grid.grid-4", {},
        card(stat("Target fund", usd(target), { sub: `${data.targetMonths} months of expenses` })),
        card(stat("Current savings", usd(data.currentSavings), { tone: "pos" })),
        card(stat("Months covered", monthsCovered.toFixed(1), { sub: funded ? "fully funded ✓" : "of " + data.targetMonths, tone: funded ? "pos" : null })),
        card(stat(funded ? "Surplus" : "Still needed", usd(funded ? data.currentSavings - target : gap), { tone: funded ? "pos" : "neg" })),
      ),
      card(
        el("div.spread", {}, el("h2", {}, "Progress"), el("span.pill." + (funded ? "pos" : "warn"), {}, pct(Math.min(frac, 1) * 100, 0))),
        el("div", { style: "margin:10px 0" }, progressBar(frac, funded)),
        funded
          ? el("p.card-sub", {}, "You've reached your emergency fund goal. Consider directing new savings toward investments or other goals.")
          : el("p.card-sub", {}, `Saving ${usd(data.monthlyContribution)}/mo, you'll be fully funded in about ${isFinite(monthsToFull) ? monthsToFull + " months" : "—"}.`),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, inputCard(), tipsCard(monthsCovered)),
      el("p.disclaimer", {}, "A common guideline is 3–6 months of essential expenses; more if your income is variable or you're a sole earner."),
    );
  }

  function inputCard() {
    return card(
      el("div.spread", {}, el("h2", {}, "Your Numbers"),
        button("↻ Re-seed from my data", () => { save(KEY, seed()); Object.assign(data, load(KEY, {})); draw(); }, "ghost btn-sm")),
      el("p.card-sub", {}, "Seeded from Cash Flow expenses and cash accounts in Net Worth."),
      el("div.stack", {},
        field("Monthly essential expenses", moneyInput(data.monthlyExpenses, (v) => set("monthlyExpenses", v))),
        field("Current emergency savings", moneyInput(data.currentSavings, (v) => set("currentSavings", v))),
        el("div.form-grid", {},
          field("Target coverage", select(String(data.targetMonths), MONTH_OPTS, (v) => set("targetMonths", +v))),
          field("Monthly contribution", moneyInput(data.monthlyContribution, (v) => set("monthlyContribution", v))),
        ),
      ),
    );
  }

  function tipsCard(monthsCovered) {
    const level = monthsCovered >= 6 ? ["Well protected", "pos", "You can weather most income disruptions. Keep it in a high-yield savings account."]
      : monthsCovered >= 3 ? ["Reasonably covered", "warn", "You have a solid base. Keep building toward 6 months for extra security."]
      : monthsCovered >= 1 ? ["Getting started", "warn", "You have a starter cushion. Prioritize growing this before other investing."]
      : ["Vulnerable", "neg", "A single surprise expense could mean debt. Make this your top financial priority."];
    return card(
      el("h2", {}, "Where You Stand"),
      el("div", { style: "padding:14px;background:var(--surface-2);border-radius:9px" },
        el("div", { class: level[1], style: "font-weight:700;font-size:16px" }, level[0]),
        el("p.small.muted", { style: "margin:6px 0 0" }, level[2]),
      ),
    );
  }

  draw();
}
