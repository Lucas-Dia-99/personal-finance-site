import { el, clear, pageHead, card, stat, field, moneyInput, progressBar, button } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { projectBalance, toMonthly } from "../lib/finance.js";
import { lineChart } from "../chart.js";
import { getProfile } from "../profile.js";

const KEY = "fire";

// Pull sensible starting numbers from the user's other data.
function seedDefaults() {
  const cf = load("cashflow", { income: [], expenses: [] });
  const nw = load("networth", { assets: [] });
  const p = getProfile();
  const monthlyExpenses = cf.expenses.reduce((t, e) => t + toMonthly(+e.amount || 0, e.frequency), 0);
  const monthlyIncome = cf.income.reduce((t, e) => t + toMonthly(+e.amount || 0, e.frequency), 0);
  const invested = nw.assets
    .filter((a) => ["Investments", "Retirement", "Savings"].includes(a.category))
    .reduce((t, a) => t + (+a.value || 0), 0);
  return {
    currentAge: p.age,
    annualExpenses: Math.round(monthlyExpenses * 12) || 50000,
    invested: Math.round(invested) || 60000,
    monthlyContribution: Math.round(Math.max(0, monthlyIncome - monthlyExpenses)) || 1500,
    annualReturn: 7,
    inflation: 2.5,
    withdrawalRate: 4,
    targetAge: p.retireAge,
  };
}

export default function render(root) {
  const data = load(KEY, null) || save(KEY, seedDefaults());
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const realReturn = (1 + data.annualReturn / 100) / (1 + data.inflation / 100) - 1; // inflation-adjusted
    const fireNumber = data.annualExpenses / (data.withdrawalRate / 100);

    // Years to FIRE: grow invested + contributions at the real return until >= FIRE number.
    const series = projectBalance({
      startBalance: +data.invested, monthlyContribution: +data.monthlyContribution,
      annualReturn: realReturn * 100, years: 60, startAge: +data.currentAge,
    });
    const hitIdx = series.findIndex((s) => s.balance >= fireNumber);
    const yearsToFire = hitIdx === -1 ? Infinity : hitIdx;
    const fireAge = isFinite(yearsToFire) ? data.currentAge + yearsToFire : null;

    // Coast FIRE: amount needed today that grows (no new contributions) to the
    // FIRE number by the target retirement age.
    const coastYears = Math.max(0, data.targetAge - data.currentAge);
    const coastNumber = fireNumber / Math.pow(1 + realReturn, coastYears);
    const isCoast = data.invested >= coastNumber;
    const progress = fireNumber > 0 ? data.invested / fireNumber : 0;

    root.append(
      pageHead("FIRE / Coast FIRE", "Financial Independence, Retire Early — your number, your timeline, and whether you can coast."),
      el("div.grid.grid-4", {},
        card(stat("FIRE number", usd(fireNumber), { sub: `${data.withdrawalRate}% of ${usd(data.annualExpenses)}/yr` })),
        card(stat("Years to FIRE", isFinite(yearsToFire) ? String(yearsToFire) : "60+", { sub: fireAge ? `at age ${fireAge}` : "increase savings" })),
        card(stat("Progress to FIRE", pct(Math.min(progress, 1) * 100, 0), { sub: el("div", { style: "margin-top:8px" }, progressBar(progress, progress >= 1)) })),
        card(stat("Coast FIRE number", usd(coastNumber), { sub: isCoast ? "✓ already coasting" : "needed today", tone: isCoast ? "pos" : null })),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, inputCard(coastYears), statusCard(isCoast, coastNumber, fireNumber, yearsToFire, fireAge, realReturn)),
      chartCard(series, fireNumber),
      el("p.disclaimer", {}, "Uses an inflation-adjusted (real) return so all figures are in today's dollars. The 4% rule and constant returns are simplifications, not guarantees."),
    );
  }

  function inputCard(coastYears) {
    return card(
      el("h2", {}, "Your Numbers"),
      el("p.card-sub", {}, "Seeded from your Cash Flow & Net Worth — adjust as needed."),
      el("div.stack", {},
        field("Annual spending in retirement", moneyInput(data.annualExpenses, (v) => set("annualExpenses", v))),
        field("Invested assets today", moneyInput(data.invested, (v) => set("invested", v))),
        field("Monthly contribution", moneyInput(data.monthlyContribution, (v) => set("monthlyContribution", v))),
        el("div.form-grid", {},
          field("Current age", moneyInput(data.currentAge, (v) => set("currentAge", v), { suffix: "yrs" })),
          field("Coast target age", moneyInput(data.targetAge, (v) => set("targetAge", v), { suffix: "yrs" }), `${coastYears} yrs of compounding`),
        ),
        el("div.form-grid", {},
          field("Annual return", moneyInput(data.annualReturn, (v) => set("annualReturn", v), { suffix: "%" })),
          field("Inflation", moneyInput(data.inflation, (v) => set("inflation", v), { suffix: "%" })),
        ),
        field("Withdrawal rate", moneyInput(data.withdrawalRate, (v) => set("withdrawalRate", v), { suffix: "%" }), "Safe withdrawal rate (4% rule)"),
        button("↻ Re-seed from my data", () => { save(KEY, seedDefaults()); Object.assign(data, load(KEY, {})); draw(); }, "ghost btn-sm"),
      ),
    );
  }

  function statusCard(isCoast, coastNumber, fireNumber, yearsToFire, fireAge, realReturn) {
    return card(
      el("h2", {}, "Where You Stand"),
      el("div.list", { style: "margin-top:6px" },
        infoRow(isCoast ? "🌱 You've hit Coast FIRE" : "Coast FIRE not yet reached",
          isCoast
            ? `Your investments alone should grow to your FIRE number by age ${data.targetAge} with no further contributions.`
            : `You need ${usd(Math.max(0, coastNumber - data.invested))} more invested today to coast to retirement at age ${data.targetAge}.`,
          isCoast ? "pos" : null),
        infoRow(isFinite(yearsToFire) ? `🔥 Full FIRE in ${yearsToFire} years` : "🔥 FIRE beyond 60 years",
          fireAge ? `At your current pace you reach ${usd(fireNumber)} around age ${fireAge}.` : "Increase contributions or reduce target spending to bring this in range."),
        infoRow("📈 Real return assumed", `${pct(realReturn * 100, 1)} after inflation — all figures shown in today's dollars.`),
      ),
    );
  }

  function infoRow(title, body, tone) {
    return el("div", { style: "padding:10px 12px;background:var(--surface-2);border-radius:9px" },
      el("div", { class: "li-name " + (tone || ""), style: "font-weight:600" }, title),
      el("div.li-meta", { style: "margin-top:2px" }, body),
    );
  }

  function chartCard(series, fireNumber) {
    const idx = series.findIndex((s) => s.balance >= fireNumber);
    const cut = idx === -1 ? Math.min(series.length, 41) : Math.min(series.length, idx + 3);
    const trimmed = series.slice(0, cut);
    const step = Math.max(1, Math.round(trimmed.length / 12));
    const pts = trimmed.filter((s, i) => i % step === 0 || i === trimmed.length - 1)
      .map((s) => ({ label: String(s.age), value: Math.round(s.balance) }));
    return card(
      el("h2", {}, "Path to FIRE"),
      el("p.card-sub", {}, `Inflation-adjusted balance vs. your ${usd(fireNumber)} target.`),
      lineChart(pts),
    );
  }

  draw();
}
