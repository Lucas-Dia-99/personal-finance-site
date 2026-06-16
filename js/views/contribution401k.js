import { el, clear, pageHead, card, stat, field, moneyInput, select } from "../ui.js";
import { load, save } from "../store.js";
import { usd, pct } from "../format.js";
import { paycheckBreakdown } from "../lib/tax.js";
import { TAX, TAX_YEAR, FILING_OPTIONS, FREQUENCY } from "../data/tax.js";
import { lineChart } from "../chart.js";
import { getProfile, saveProfile } from "../profile.js";
import { button } from "../ui.js";

const KEY = "contrib401k";
function makeDefault() {
  const p = getProfile();
  return { salary: p.salary, filing: p.filing, periods: p.periods, contribPct: 6, employerMatchPct: 50, matchLimitPct: 6, age: p.age, stateRate: p.stateRate };
}

export default function render(root) {
  const data = load(KEY, makeDefault());
  function set(k, v) {
    data[k] = v; save(KEY, data);
    if (["salary", "filing", "periods", "age", "stateRate"].includes(k)) saveProfile({ [k]: v });
    draw();
  }
  function useProfile() {
    const p = getProfile();
    Object.assign(data, { salary: p.salary, filing: p.filing, periods: p.periods, age: p.age, stateRate: p.stateRate });
    save(KEY, data); draw();
  }

  const takeHome = (pct401) => paycheckBreakdown({
    gross: data.salary, filing: data.filing,
    pretax401k: data.salary * (pct401 / 100), pretaxBenefits: 0, stateRate: data.stateRate,
  }).net;

  function draw() {
    clear(root);
    const periods = +data.periods;
    const contribAnnual = data.salary * (data.contribPct / 100);
    const netWith = takeHome(data.contribPct);
    const netWithout = takeHome(0);
    const paycheckDrop = netWithout - netWith;          // how much take-home actually falls
    const taxSavings = contribAnnual - paycheckDrop;    // the rest is "free" from tax deferral

    const employerMatch = Math.min(data.contribPct, data.matchLimitPct) / 100 * data.salary * (data.employerMatchPct / 100);
    const limit = limitFor(data.age);
    const overLimit = contribAnnual > limit;

    root.append(
      pageHead("401(k) Paycheck Impact", `See how much a pre-tax contribution really costs your take-home pay (${TAX_YEAR} limits).`),
      el("div.grid.grid-2", {}, inputCard(), impactCard(contribAnnual, paycheckDrop, taxSavings, periods)),
      el("div.grid.grid-3", { style: "margin-top:0" },
        card(stat("Your contribution", usd(contribAnnual), { sub: `${pct(data.contribPct, 0)} of salary`, tone: "pos" })),
        card(stat("Employer match", usd(employerMatch), { sub: `${pct(data.employerMatchPct, 0)} up to ${pct(data.matchLimitPct, 0)}`, tone: "pos" })),
        card(stat("Total into 401(k)", usd(contribAnnual + employerMatch), { sub: "per year", tone: "pos" })),
      ),
      limitCard(contribAnnual, limit, overLimit),
      curveCard(),
      el("p.disclaimer", {}, "Pre-tax (traditional) 401(k) assumed. Contributions lower federal & state taxable income but are still subject to Social Security and Medicare. Estimates only."),
    );
  }

  function inputCard() {
    return card(
      el("div.spread", {}, el("h2", {}, "Details"), button("↻ Use my profile", useProfile, "ghost btn-sm")),
      el("div.stack", {},
        field("Annual salary", moneyInput(data.salary, (v) => set("salary", v))),
        el("div.form-grid", {},
          field("Filing status", select(data.filing, FILING_OPTIONS, (v) => set("filing", v))),
          field("Pay frequency", select(data.periods, FREQUENCY, (v) => set("periods", v))),
        ),
        el("div.form-grid", {},
          field("Your contribution", moneyInput(data.contribPct, (v) => set("contribPct", v), { suffix: "%" })),
          field("Your age", moneyInput(data.age, (v) => set("age", v), { suffix: "yrs" })),
        ),
        el("div.form-grid", {},
          field("Employer match", moneyInput(data.employerMatchPct, (v) => set("employerMatchPct", v), { suffix: "%" }), "e.g. 50% = $0.50/$1"),
          field("Match limit", moneyInput(data.matchLimitPct, (v) => set("matchLimitPct", v), { suffix: "%" }), "up to % of salary"),
        ),
        field("State income tax", moneyInput(data.stateRate, (v) => set("stateRate", v), { suffix: "%" })),
      ),
    );
  }

  function impactCard(contribAnnual, paycheckDrop, taxSavings, periods) {
    const per = (n) => n / periods;
    return card(
      el("h2", {}, "The Real Cost"),
      el("p.card-sub", {}, "What contributing actually does to your paycheck."),
      el("div.list", {},
        bigRow("You contribute", usd(contribAnnual), usd(per(contribAnnual), { cents: true }), "pos"),
        bigRow("Paycheck drops by", usd(paycheckDrop), usd(per(paycheckDrop), { cents: true }), "neg"),
        bigRow("Upfront tax savings", usd(taxSavings), usd(per(taxSavings), { cents: true }), "pos"),
      ),
      el("p.card-sub", { style: "margin-top:14px" },
        `Every $1.00 you contribute lowers your take-home by only `,
        el("strong", {}, usd(contribAnnual > 0 ? paycheckDrop / contribAnnual : 0, { cents: true })),
        ` — the rest is deferred tax.`),
    );
  }

  function bigRow(label, annual, per, tone) {
    return el("div.line-item", { style: "grid-template-columns:1fr auto" },
      el("div", {}, el("div.li-name", {}, label), el("div.li-meta", {}, per + " / paycheck")),
      el("div.li-amount." + tone, {}, annual + "/yr"),
    );
  }

  function limitCard(contrib, limit, over) {
    return card(
      el("div.spread", {}, el("h2", {}, "Contribution Limit"),
        el("span.pill." + (over ? "warn" : "pos"), {}, over ? "Over limit" : "Within limit")),
      el("p.card-sub", {}, `IRS ${TAX_YEAR} elective-deferral limit for your age: ${usd(limit)}.`),
      over
        ? el("p.neg.small", {}, `Your ${usd(contrib)} exceeds the limit by ${usd(contrib - limit)}. Reduce your contribution percentage.`)
        : el("p.muted.small", {}, `You can still contribute ${usd(limit - contrib)} more this year.`),
    );
  }

  // Take-home vs. contribution % curve.
  function curveCard() {
    const points = [];
    for (let p = 0; p <= 20; p += 2) points.push({ label: p + "%", value: Math.round(takeHome(p)) });
    return card(
      el("h2", {}, "Take-Home vs. Contribution %"),
      el("p.card-sub", {}, "Annual take-home pay as you dial contributions up."),
      lineChart(points),
    );
  }

  draw();
}

function limitFor(age) {
  const { base, catchUp50, catchUp60to63 } = TAX.limit401k;
  if (age >= 60 && age <= 63) return base + catchUp60to63;
  if (age >= 50) return base + catchUp50;
  return base;
}
