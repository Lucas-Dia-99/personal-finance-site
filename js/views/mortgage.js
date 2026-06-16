import { el, clear, pageHead, card, stat, field, moneyInput } from "../ui.js";
import { load, save } from "../store.js";
import { usd } from "../format.js";
import { amortization } from "../lib/housing.js";
import { monthsToWords } from "../lib/debt.js";
import { lineChart } from "../chart.js";

const KEY = "mortgage";
const DEFAULT = { price: 400000, downPct: 20, rate: 6.5, term: 30, extra: 0 };

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const down = data.price * (data.downPct / 100);
    const loan = Math.max(0, data.price - down);
    const base = amortization(loan, data.rate, data.term, 0);
    const withExtra = amortization(loan, data.rate, data.term, data.extra);
    const interestSaved = Math.max(0, base.totalInterest - withExtra.totalInterest);
    const monthsSaved = Math.max(0, base.months - withExtra.months);

    root.append(
      pageHead("Mortgage Calculator", "Monthly payment, total interest, and what extra principal saves you."),
      el("div.grid.grid-4", {},
        card(stat("Loan amount", usd(loan), { sub: `${usd(down)} down (${data.downPct}%)` })),
        card(stat("Monthly P&I", usd(withExtra.payment + (+data.extra || 0)), { sub: data.extra > 0 ? `incl. ${usd(data.extra)} extra` : "principal & interest" })),
        card(stat("Total interest", usd(withExtra.totalInterest), { sub: "over the loan", tone: "neg" })),
        card(stat("Payoff time", monthsToWords(withExtra.months), { sub: data.extra > 0 ? `${monthsToWords(monthsSaved)} sooner` : `${data.term}-year term` })),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, inputCard(down, loan), summaryCard(base, withExtra, interestSaved, monthsSaved)),
      chartCard(withExtra),
      scheduleCard(withExtra),
      el("p.disclaimer", {}, "Principal & interest only — property tax, insurance, PMI and HOA are not included. See the Affordability tool for full PITI."),
    );
  }

  function inputCard(down, loan) {
    return card(
      el("h2", {}, "Loan Details"),
      el("div.stack", {},
        field("Home price", moneyInput(data.price, (v) => set("price", v))),
        el("div.form-grid", {},
          field("Down payment", moneyInput(data.downPct, (v) => set("downPct", v), { suffix: "%" }), `${usd(down)}`),
          field("Interest rate", moneyInput(data.rate, (v) => set("rate", v), { suffix: "%" })),
        ),
        el("div.form-grid", {},
          field("Term", moneyInput(data.term, (v) => set("term", v), { suffix: "yrs" })),
          field("Extra monthly principal", moneyInput(data.extra, (v) => set("extra", v))),
        ),
      ),
    );
  }

  function summaryCard(base, withExtra, interestSaved, monthsSaved) {
    return card(
      el("h2", {}, "Payoff Summary"),
      el("table.data", {},
        el("tbody", {},
          row("Total of payments", usd(withExtra.totalPaid)),
          row("Total interest", usd(withExtra.totalInterest), "neg"),
          data.extra > 0 && row("Interest saved by extra", "+" + usd(interestSaved), "pos"),
          data.extra > 0 && row("Time saved", monthsToWords(monthsSaved), "pos"),
        ),
      ),
      data.extra > 0
        ? el("p.card-sub", { style: "margin-top:12px" }, `Paying ${usd(data.extra)} extra each month clears the loan ${monthsToWords(monthsSaved)} early.`)
        : el("p.card-sub", { style: "margin-top:12px" }, "Add an extra monthly amount to see interest savings."),
    );
  }

  function chartCard(amort) {
    const step = Math.max(1, Math.round(amort.series.length / 24));
    const pts = amort.series.filter((s, i) => i % step === 0 || i === amort.series.length - 1)
      .map((s) => ({ label: s.month % 12 === 0 ? `${s.month / 12}y` : String(s.month), value: Math.round(s.balance) }));
    return card(el("h2", {}, "Balance Over Time"), lineChart(pts));
  }

  function scheduleCard(amort) {
    const tbody = el("tbody");
    amort.yearly.filter((y) => y.year > 0).forEach((y) => {
      tbody.append(el("tr", {},
        el("td", {}, "Year " + y.year),
        el("td", {}, usd(y.principal)),
        el("td", {}, usd(y.interest)),
        el("td", {}, usd(y.balance)),
      ));
    });
    return card(
      el("h2", {}, "Yearly Schedule"),
      el("table.data", {},
        el("thead", {}, el("tr", {}, el("th", {}, "Period"), el("th", {}, "Principal"), el("th", {}, "Interest"), el("th", {}, "Balance"))),
        tbody,
      ),
    );
  }

  draw();
}

function row(label, val, tone) {
  if (!label) return null;
  return el("tr", {}, el("td", {}, label), el("td", { class: tone || "" }, val));
}
