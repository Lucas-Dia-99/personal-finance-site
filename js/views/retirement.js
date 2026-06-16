import { el, clear, pageHead, card, stat, field, moneyInput } from "../ui.js";
import { load, save } from "../store.js";
import { usd } from "../format.js";
import { projectBalance, realValue } from "../lib/finance.js";
import { lineChart } from "../chart.js";

const KEY = "retirement";
const DEFAULT = {
  currentAge: 35, retireAge: 65, currentSavings: 60000,
  monthlyContribution: 800, annualReturn: 7, inflation: 2.5, withdrawalRate: 4,
};

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const years = Math.max(0, data.retireAge - data.currentAge);
    const series = projectBalance({
      startBalance: +data.currentSavings,
      monthlyContribution: +data.monthlyContribution,
      annualReturn: +data.annualReturn,
      years, startAge: +data.currentAge,
    });
    const end = series[series.length - 1];
    const nominal = end.balance;
    const real = realValue(nominal, data.inflation, years);
    const totalContributed = (+data.currentSavings) + end.contributed;
    const growth = nominal - totalContributed;
    const annualIncome = nominal * (data.withdrawalRate / 100);

    root.append(
      pageHead("Retirement Calculator", "Project your nest egg and the income it could provide."),
      el("div.grid.grid-2", {}, inputCard(years), resultCard(nominal, real, annualIncome, years)),
      chartCard(series, years),
      el("div.grid.grid-3", {},
        card(stat("Total contributed", usd(totalContributed), { sub: "you + starting balance" })),
        card(stat("Investment growth", usd(growth), { sub: "earnings over time", tone: "pos" })),
        card(stat("Ending balance", usd(nominal), { sub: `at age ${data.retireAge}` })),
      ),
      el("p.disclaimer", {}, "Assumes a constant average return and steady monthly contributions. Real markets vary year to year. The 4% rule is a rough guide, not a guarantee."),
    );
  }

  function inputCard(years) {
    return card(
      el("h2", {}, "Assumptions"),
      el("p.card-sub", {}, `${years} years until retirement`),
      el("div.stack", {},
        el("div.form-grid", {},
          field("Current age", moneyInput(data.currentAge, (v) => set("currentAge", v), { suffix: "yrs" })),
          field("Retirement age", moneyInput(data.retireAge, (v) => set("retireAge", v), { suffix: "yrs" })),
        ),
        field("Current savings", moneyInput(data.currentSavings, (v) => set("currentSavings", v))),
        field("Monthly contribution", moneyInput(data.monthlyContribution, (v) => set("monthlyContribution", v))),
        el("div.form-grid", {},
          field("Annual return", moneyInput(data.annualReturn, (v) => set("annualReturn", v), { suffix: "%" }), "Long-run average"),
          field("Inflation", moneyInput(data.inflation, (v) => set("inflation", v), { suffix: "%" })),
        ),
        field("Withdrawal rate", moneyInput(data.withdrawalRate, (v) => set("withdrawalRate", v), { suffix: "%" }), "Annual, in retirement (4% rule)"),
      ),
    );
  }

  function resultCard(nominal, real, annualIncome, years) {
    return card(
      el("h2", {}, "Projected Nest Egg"),
      el("p.card-sub", {}, `In ${years} years`),
      el("div.stat", { style: "margin:6px 0 16px" },
        el("span.value", { style: "font-size:34px" }, usd(nominal)),
        el("span.sub", {}, `≈ ${usd(real)} in today's dollars`),
      ),
      el("div.grid.grid-2", {},
        stat("Annual income", usd(annualIncome), { sub: `at ${data.withdrawalRate}% withdrawal`, tone: "pos" }),
        stat("Monthly income", usd(annualIncome / 12), { sub: "in retirement", tone: "pos" }),
      ),
    );
  }

  function chartCard(series, years) {
    const stepY = Math.max(1, Math.round(years / 12));
    const pts = series.filter((s, i) => i % stepY === 0 || i === series.length - 1)
      .map((s) => ({ label: s.age != null ? String(s.age) : String(s.year), value: Math.round(s.balance) }));
    return card(
      el("h2", {}, "Growth Over Time"),
      el("p.card-sub", {}, "Projected balance by age."),
      lineChart(pts),
      el("div.legend", { style: "margin-top:8px" }, el("span", { style: "color:var(--primary)" }, "Account balance")),
    );
  }

  draw();
}
