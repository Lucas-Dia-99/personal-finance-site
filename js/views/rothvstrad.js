import { el, clear, pageHead, card, stat, field, moneyInput, button } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { lineChart } from "../chart.js";
import { marginalRate } from "../lib/tax.js";
import { TAX } from "../data/tax.js";
import { getProfile } from "../profile.js";

const KEY = "rothvstrad";
const DEFAULT = { contribution: 7000, currentRate: 24, retireRate: 22, years: 30, annualReturn: 7 };

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }
  function useProfile() {
    const p = getProfile();
    const taxable = Math.max(0, p.salary - (TAX.standardDeduction[p.filing] || 0));
    data.currentRate = Math.round(marginalRate(taxable, p.filing) * 100);
    data.years = Math.max(1, p.retireAge - p.age);
    save(KEY, data); draw();
  }

  function draw() {
    clear(root);
    const r = data.annualReturn / 100;
    const growth = Math.pow(1 + r, data.years);

    // Same pre-tax income (the "contribution") devoted to each account.
    // Traditional invests the full amount, taxed on withdrawal.
    // Roth invests what's left after paying tax now, then grows tax-free.
    const tradInvested = data.contribution;
    const rothInvested = data.contribution * (1 - data.currentRate / 100);

    const tradFV = tradInvested * growth;
    const tradAfterTax = tradFV * (1 - data.retireRate / 100);
    const rothFV = rothInvested * growth;
    const rothAfterTax = rothFV; // tax-free

    const diff = rothAfterTax - tradAfterTax;
    const rothWins = diff > 0;

    root.append(
      pageHead("Roth vs. Traditional", "Compare pre-tax (Traditional) and after-tax (Roth) retirement contributions."),
      el("div.grid.grid-2", {}, inputCard(), winnerCard(rothAfterTax, tradAfterTax, diff, rothWins)),
      el("div.grid.grid-2", {},
        accountCard("Roth", "after-tax dollars in, tax-free out", rothInvested, rothFV, rothAfterTax, 0, "accent"),
        accountCard("Traditional", "pre-tax dollars in, taxed out", tradInvested, tradFV, tradAfterTax, tradFV - tradAfterTax, "primary"),
      ),
      chartCard(rothInvested, tradInvested, r),
      el("p.disclaimer", {}, "Compares the same pre-tax income devoted to each account. Roth wins when your retirement tax rate is at least your current rate; Traditional wins when you expect a lower rate later. Ignores RMDs, contribution-limit differences, and tax-diversification benefits — consult a tax professional."),
    );
  }

  function inputCard() {
    return card(
      el("div.spread", {}, el("h2", {}, "Assumptions"), button("↻ Use my profile", useProfile, "ghost btn-sm")),
      el("div.stack", {},
        field("Annual contribution", moneyInput(data.contribution, (v) => set("contribution", v)), "Pre-tax income devoted to retirement"),
        el("div.form-grid", {},
          field("Tax rate now", moneyInput(data.currentRate, (v) => set("currentRate", v), { suffix: "%" }), "Current marginal rate"),
          field("Tax rate in retirement", moneyInput(data.retireRate, (v) => set("retireRate", v), { suffix: "%" }), "Expected marginal rate"),
        ),
        el("div.form-grid", {},
          field("Years to retirement", moneyInput(data.years, (v) => set("years", v), { suffix: "yrs" })),
          field("Annual return", moneyInput(data.annualReturn, (v) => set("annualReturn", v), { suffix: "%" })),
        ),
      ),
    );
  }

  function winnerCard(roth, trad, diff, rothWins) {
    return card(
      el("h2", {}, "Bottom Line"),
      el("p.card-sub", {}, "After-tax value at retirement"),
      el("div.stat", { style: "margin:6px 0 14px" },
        el("span.value", { style: "font-size:30px" }, rothWins ? "Roth wins" : (Math.abs(diff) < 1 ? "It's a tie" : "Traditional wins")),
        el("span.sub", {}, Math.abs(diff) < 1 ? "Same outcome at equal tax rates" : `by ${usd(Math.abs(diff))} more spendable`),
      ),
      el("div.grid.grid-2", {},
        stat("Roth, after tax", usd(roth), { tone: rothWins ? "pos" : null }),
        stat("Traditional, after tax", usd(trad), { tone: !rothWins && Math.abs(diff) >= 1 ? "pos" : null }),
      ),
    );
  }

  function accountCard(name, sub, invested, fv, afterTax, taxOwed, tone) {
    return card(
      el("div.spread", {}, el("h2", {}, name + " account"), el("span.tag", {}, name === "Roth" ? "tax-free growth" : "tax-deferred")),
      el("p.card-sub", {}, sub),
      el("table.data", {},
        el("tbody", {},
          row("Invested upfront", usd(invested)),
          row("Grows to", usd(fv)),
          taxOwed > 0 ? row("Tax at withdrawal", "−" + usd(taxOwed), "neg") : row("Tax at withdrawal", "$0", "pos"),
          el("tr.total", {}, el("td", {}, "Spendable in retirement"), el("td", {}, usd(afterTax))),
        ),
      ),
    );
  }

  function chartCard(rothInvested, tradInvested, r) {
    const pts = [];
    const yrs = +data.years;
    const step = Math.max(1, Math.round(yrs / 12));
    for (let y = 0; y <= yrs; y += step) {
      const g = Math.pow(1 + r, y);
      pts.push({ label: y + "y", value: Math.round(rothInvested * g) });
    }
    // Show Roth after-tax balance growth (tax-free) as the headline line.
    return card(
      el("h2", {}, "Roth Balance Growth (tax-free)"),
      el("p.card-sub", {}, "What your after-tax Roth contribution becomes over time."),
      lineChart(pts),
    );
  }

  draw();
}

function row(label, val, tone) {
  return el("tr", {}, el("td", {}, label), el("td", { class: tone || "" }, val));
}
