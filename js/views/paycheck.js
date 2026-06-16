import { el, clear, pageHead, card, stat, field, moneyInput, select } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { paycheckBreakdown } from "../lib/tax.js";
import { TAX_YEAR, FILING_OPTIONS, FREQUENCY } from "../data/tax.js";

const KEY = "paycheck";
const DEFAULT = { salary: 85000, filing: "single", periods: "26", contrib401kPct: 6, benefits: 200, stateRate: 5 };

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function set(k, v) { data[k] = v; save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const periods = +data.periods;
    const pretax401k = data.salary * (data.contrib401kPct / 100);
    const annualBenefits = (+data.benefits || 0) * periods;
    const r = paycheckBreakdown({
      gross: data.salary, filing: data.filing,
      pretax401k, pretaxBenefits: annualBenefits, stateRate: data.stateRate,
    });
    const per = (n) => n / periods;

    root.append(
      pageHead("Paycheck Calculator", `Estimate take-home pay after taxes and pre-tax deductions (${TAX_YEAR} federal tax tables).`),
      el("div.grid.grid-2", {},
        inputCard(),
        resultCard(r, per, periods),
      ),
      breakdownCard(r, per),
      disclaimer(),
    );
  }

  function inputCard() {
    return card(
      el("h2", {}, "Your Pay"),
      el("p.card-sub", {}, "Enter gross salary and deductions."),
      el("div.stack", {},
        field("Annual gross salary", moneyInput(data.salary, (v) => set("salary", v))),
        el("div.form-grid", {},
          field("Filing status", select(data.filing, FILING_OPTIONS, (v) => set("filing", v))),
          field("Pay frequency", select(data.periods, FREQUENCY, (v) => set("periods", v))),
        ),
        el("div.form-grid", {},
          field("401(k) contribution", moneyInput(data.contrib401kPct, (v) => set("contrib401kPct", v), { suffix: "%" }), "Pre-tax, % of gross"),
          field("State income tax", moneyInput(data.stateRate, (v) => set("stateRate", v), { suffix: "%" }), "Flat rate (simplified)"),
        ),
        field("Pre-tax benefits per paycheck", moneyInput(data.benefits, (v) => set("benefits", v)), "Health / dental / HSA, etc."),
      ),
    );
  }

  function resultCard(r, per, periods) {
    const label = FREQUENCY.find((f) => f[0] === String(periods))?.[1] || "";
    return card(
      el("h2", {}, "Take-Home Pay"),
      el("p.card-sub", {}, `${label} net paycheck`),
      el("div.stat", { style: "margin:6px 0 18px" },
        el("span.value", { style: "font-size:34px" }, usd(per(r.net), { cents: true })),
        el("span.sub", {}, `${usd(r.net)} net per year`),
      ),
      el("div.grid.grid-2", {},
        stat("Gross / check", usd(per(r.gross), { cents: true })),
        stat("Taxes / check", usd(per(r.totalTax), { cents: true }), { tone: "neg" }),
        stat("Effective tax rate", pct(r.effective * 100)),
        stat("Marginal fed. bracket", pct(r.marginal * 100, 0)),
      ),
    );
  }

  function breakdownCard(r, per) {
    const rows = [
      ["Gross pay", r.gross, "head"],
      ["Pre-tax 401(k)", -r.pretax401k],
      ["Pre-tax benefits", -r.pretaxBenefits],
      ["Federal income tax", -r.federal],
      ["State income tax", -r.state],
      ["Social Security (6.2%)", -r.fica.socialSecurity],
      ["Medicare (1.45%+)", -r.fica.medicare],
    ];
    const tbody = el("tbody");
    rows.forEach(([label, val]) => {
      tbody.append(el("tr", {},
        el("td", {}, label),
        el("td", { class: val < 0 ? "neg" : "" }, (val < 0 ? "−" : "") + usd(Math.abs(val))),
        el("td", {}, usd(Math.abs(per(val)), { cents: true })),
      ));
    });
    tbody.append(el("tr.total", {}, el("td", {}, "Net take-home"), el("td", {}, usd(r.net)), el("td", {}, usd(per(r.net), { cents: true }))));
    return card(
      el("h2", {}, "Full Breakdown"),
      el("table.data", {},
        el("thead", {}, el("tr", {}, el("th", {}, "Item"), el("th", {}, "Annual"), el("th", {}, "Per check"))),
        tbody,
      ),
    );
  }

  draw();
}

function disclaimer() {
  return el("p.disclaimer", {}, "Estimates only, for planning — not tax advice. Uses federal tables, a flat state rate, and the standard deduction. Local taxes, additional withholdings, and credits are not modeled.");
}
