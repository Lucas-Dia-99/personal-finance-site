import { el, clear, pageHead, card, stat, field, moneyInput, button } from "../ui.js";
import { load, save } from "../store.js";
import { usd } from "../format.js";
import { affordability } from "../lib/housing.js";
import { getProfile } from "../profile.js";

const KEY = "affordability";
function makeDefault() {
  return { annualIncome: getProfile().salary, monthlyDebts: 400, downPayment: 60000, rate: 6.5, term: 30, taxInsRate: 1.7 };
}

export default function render(root) {
  const data = load(KEY, makeDefault());
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const grossMonthly = data.annualIncome / 12;
    const r = affordability({
      grossMonthly, monthlyDebts: data.monthlyDebts, downPayment: data.downPayment,
      rate: data.rate, years: data.term, taxInsRate: data.taxInsRate,
    });

    root.append(
      pageHead("Home Affordability", "How much house your income supports, using the 28/36 debt-to-income rule."),
      el("div.grid.grid-3", {},
        card(stat("Max home price", usd(r.price), { tone: "pos" })),
        card(stat("Max loan", usd(r.loan), { sub: `${usd(data.downPayment)} down` })),
        card(stat("Max housing payment", usd(r.maxPITI), { sub: `limited by ${r.limitedBy}` })),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" },
        inputCard(grossMonthly),
        breakdownCard(r),
      ),
      el("p.disclaimer", {}, "The 28/36 rule caps housing at 28% of gross income and total debt at 36%. Lenders vary; PMI, credit score, and loan type also affect what you qualify for."),
    );
  }

  function inputCard(grossMonthly) {
    return card(
      el("div.spread", {}, el("h2", {}, "Your Finances"),
        button("↻ Use my profile", () => { set("annualIncome", getProfile().salary); }, "ghost btn-sm")),
      el("p.card-sub", {}, `${usd(grossMonthly)}/mo gross income`),
      el("div.stack", {},
        field("Annual income", moneyInput(data.annualIncome, (v) => set("annualIncome", v))),
        field("Other monthly debt payments", moneyInput(data.monthlyDebts, (v) => set("monthlyDebts", v)), "Car, student loans, credit cards"),
        field("Down payment", moneyInput(data.downPayment, (v) => set("downPayment", v))),
        el("div.form-grid", {},
          field("Interest rate", moneyInput(data.rate, (v) => set("rate", v), { suffix: "%" })),
          field("Term", moneyInput(data.term, (v) => set("term", v), { suffix: "yrs" })),
        ),
        field("Property tax + insurance", moneyInput(data.taxInsRate, (v) => set("taxInsRate", v), { suffix: "%" }), "Annual, as % of home value"),
      ),
    );
  }

  function breakdownCard(r) {
    return card(
      el("h2", {}, "Payment Breakdown"),
      el("p.card-sub", {}, "At your maximum home price"),
      el("table.data", {},
        el("tbody", {},
          row("Principal & interest", usd(r.pi)),
          row("Property tax + insurance", usd(r.taxInsMonthly)),
          el("tr.total", {}, el("td", {}, "Total monthly (PITI)"), el("td", {}, usd(r.maxPITI))),
        ),
      ),
    );
  }

  draw();
}

function row(label, val) {
  return el("tr", {}, el("td", {}, label), el("td", {}, val));
}
