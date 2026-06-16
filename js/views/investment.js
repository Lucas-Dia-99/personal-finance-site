import { el, clear, pageHead, card, stat, field, moneyInput } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { projectBalance } from "../lib/finance.js";
import { lineChart } from "../chart.js";

const KEY = "investment";
const DEFAULT = { initial: 10000, monthly: 500, years: 20, rate: 7 };

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const series = projectBalance({ startBalance: +data.initial, monthlyContribution: +data.monthly, annualReturn: +data.rate, years: +data.years });
    const end = series[series.length - 1];
    const contributed = (+data.initial) + end.contributed;
    const growth = end.balance - contributed;
    const growthShare = end.balance > 0 ? growth / end.balance : 0;

    root.append(
      pageHead("Investment Growth", "Compound interest sandbox: see how contributions and returns build wealth over time."),
      el("div.grid.grid-2", {}, inputCard(), resultCard(end, contributed, growth, growthShare)),
      card(el("h2", {}, "Growth Over Time"), el("p.card-sub", {}, "Balance by year."), lineChart(chartPts(series))),
      el("div.grid.grid-3", {},
        card(stat("Total contributed", usd(contributed))),
        card(stat("Investment growth", usd(growth), { tone: "pos" })),
        card(stat("Growth share", pct(growthShare * 100, 0), { sub: "of final balance" })),
      ),
      el("p.disclaimer", {}, "Assumes a constant average annual return compounded monthly. Actual returns vary year to year and aren't guaranteed."),
    );
  }

  function inputCard() {
    return card(
      el("h2", {}, "Inputs"),
      el("div.stack", {},
        field("Initial investment", moneyInput(data.initial, (v) => set("initial", v))),
        field("Monthly contribution", moneyInput(data.monthly, (v) => set("monthly", v))),
        el("div.form-grid", {},
          field("Years", moneyInput(data.years, (v) => set("years", v), { suffix: "yrs" })),
          field("Annual return", moneyInput(data.rate, (v) => set("rate", v), { suffix: "%" })),
        ),
      ),
    );
  }

  function resultCard(end, contributed, growth, growthShare) {
    return card(
      el("h2", {}, "Final Balance"),
      el("p.card-sub", {}, `After ${data.years} years`),
      el("div.stat", { style: "margin:6px 0 16px" },
        el("span.value", { style: "font-size:34px" }, usd(end.balance)),
        el("span.sub", {}, `${usd(contributed)} in, ${usd(growth)} earned`),
      ),
      el("div.grid.grid-2", {},
        stat("You put in", usd(contributed)),
        stat("It grew by", usd(growth), { tone: "pos" }),
      ),
    );
  }

  function chartPts(series) {
    const step = Math.max(1, Math.round(series.length / 12));
    return series.filter((s, i) => i % step === 0 || i === series.length - 1)
      .map((s) => ({ label: s.year + "y", value: Math.round(s.balance) }));
  }

  draw();
}
