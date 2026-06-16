import { el, clear, pageHead, card, stat, field, moneyInput } from "../ui.js";
import { load, save } from "../store.js";
import { usd } from "../format.js";
import { rentVsBuy } from "../lib/housing.js";
import { lineChart } from "../chart.js";

const KEY = "rentvsbuy";
const DEFAULT = {
  price: 400000, downPayment: 80000, mortgageRate: 6.5, loanTerm: 30, closingPct: 3,
  propTaxRate: 1.1, insuranceRate: 0.4, maintenanceRate: 1, hoa: 0, appreciation: 3, sellingPct: 6,
  monthlyRent: 2200, rentGrowth: 3, rentersInsurance: 20, investReturn: 6, years: 10,
};

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const r = rentVsBuy(data);
    const buyWins = r.buyNet >= r.rentNet;
    const diff = Math.abs(r.buyNet - r.rentNet);

    root.append(
      pageHead("Rent vs. Buy", "Which leaves you wealthier? Compares net worth over your time horizon, investing the difference either way."),
      el("div.grid.grid-3", {},
        card(stat(`Buying after ${data.years} yrs`, usd(r.buyNet), { sub: "equity + investments", tone: buyWins ? "pos" : null })),
        card(stat(`Renting after ${data.years} yrs`, usd(r.rentNet), { sub: "invested savings", tone: !buyWins ? "pos" : null })),
        card(stat("Breakeven", r.breakevenYear ? `Year ${r.breakevenYear}` : "Renting wins", { sub: r.breakevenYear ? "buying pulls ahead" : `within ${data.years} years` })),
      ),
      card(
        el("h2", {}, buyWins ? "🏠 Buying comes out ahead" : "🔑 Renting comes out ahead"),
        el("p.card-sub", {}, `By ${usd(diff)} over ${data.years} years, assuming you invest the difference at ${data.investReturn}%.`),
        lineChart(seriesPts(r)),
        el("div.legend", { style: "margin-top:8px" }, el("span", { style: "color:var(--primary)" }, "Buying advantage (net worth vs. renting) — above zero means buying wins")),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, buyCard(), rentCard()),
      el("p.disclaimer", {}, "A simplified model: both paths assume the same monthly housing budget with surplus invested, and exclude income-tax effects (mortgage-interest deduction, capital gains). Local markets vary widely."),
    );
  }

  function seriesPts(r) {
    // Plot the gap (buy − rent); crossing zero marks the breakeven year.
    return r.series.map((s) => ({ label: s.year + "y", value: Math.round(s.buy - s.rent) }));
  }

  function buyCard() {
    return card(
      el("h2", {}, "Buying"),
      el("div.stack", {},
        field("Home price", moneyInput(data.price, (v) => set("price", v))),
        el("div.form-grid", {},
          field("Down payment", moneyInput(data.downPayment, (v) => set("downPayment", v))),
          field("Mortgage rate", moneyInput(data.mortgageRate, (v) => set("mortgageRate", v), { suffix: "%" })),
        ),
        el("div.form-grid", {},
          field("Loan term", moneyInput(data.loanTerm, (v) => set("loanTerm", v), { suffix: "yrs" })),
          field("Closing costs", moneyInput(data.closingPct, (v) => set("closingPct", v), { suffix: "%" })),
        ),
        el("div.form-grid", {},
          field("Property tax", moneyInput(data.propTaxRate, (v) => set("propTaxRate", v), { suffix: "%" }), "per yr"),
          field("Insurance", moneyInput(data.insuranceRate, (v) => set("insuranceRate", v), { suffix: "%" }), "per yr"),
        ),
        el("div.form-grid", {},
          field("Maintenance", moneyInput(data.maintenanceRate, (v) => set("maintenanceRate", v), { suffix: "%" }), "per yr"),
          field("HOA", moneyInput(data.hoa, (v) => set("hoa", v)), "per mo"),
        ),
        el("div.form-grid", {},
          field("Appreciation", moneyInput(data.appreciation, (v) => set("appreciation", v), { suffix: "%" }), "per yr"),
          field("Selling costs", moneyInput(data.sellingPct, (v) => set("sellingPct", v), { suffix: "%" })),
        ),
      ),
    );
  }

  function rentCard() {
    return card(
      el("h2", {}, "Renting & Shared"),
      el("div.stack", {},
        field("Monthly rent", moneyInput(data.monthlyRent, (v) => set("monthlyRent", v))),
        el("div.form-grid", {},
          field("Rent growth", moneyInput(data.rentGrowth, (v) => set("rentGrowth", v), { suffix: "%" }), "per yr"),
          field("Renter's insurance", moneyInput(data.rentersInsurance, (v) => set("rentersInsurance", v)), "per mo"),
        ),
        el("div.form-grid", {},
          field("Investment return", moneyInput(data.investReturn, (v) => set("investReturn", v), { suffix: "%" }), "on invested savings"),
          field("Time horizon", moneyInput(data.years, (v) => set("years", v), { suffix: "yrs" })),
        ),
      ),
    );
  }

  draw();
}
