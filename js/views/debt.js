import { el, clear, pageHead, card, stat, field, textInput, moneyInput, select, button, deleteBtn, empty } from "../ui.js";
import { load, save, uid } from "../store.js";
import { usd } from "../format.js";
import { simulateDebt, minimumOnly, monthsToWords } from "../lib/debt.js";
import { lineChart } from "../chart.js";

const KEY = "debt";
const DEFAULT = { debts: [], strategy: "avalanche", extra: 200 };

const STRATEGIES = [["avalanche", "Avalanche (highest APR first)"], ["snowball", "Snowball (lowest balance first)"]];

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function persist() { save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const totalBal = data.debts.reduce((t, d) => t + (+d.balance || 0), 0);
    const sim = simulateDebt(data.debts, { strategy: data.strategy, extra: data.extra });
    const base = minimumOnly(data.debts);
    const interestSaved = Math.max(0, base.totalInterest - sim.totalInterest);
    const monthsSaved = Math.max(0, base.months - sim.months);

    root.append(
      pageHead("Debt Payoff Planner", "Compare avalanche vs. snowball and see what extra payments save you."),
      el("div.grid.grid-4", {},
        card(stat("Total debt", usd(totalBal), { tone: "neg" })),
        card(stat("Debt-free in", data.debts.length ? monthsToWords(sim.months) : "—", { sub: sim.stalled ? "payments too low" : "with your plan" })),
        card(stat("Total interest", usd(sim.totalInterest), { sub: "over the payoff", tone: "neg" })),
        card(stat("Interest saved", usd(interestSaved), { sub: monthsSaved ? `${monthsToWords(monthsSaved)} sooner` : "vs. minimums only", tone: "pos" })),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, planCard(sim), debtListCard()),
      data.debts.length > 0 && payoffCard(sim),
      data.debts.length > 0 && chartCard(sim),
      el("p.disclaimer", {}, "Assumes fixed balances, APRs and minimum payments with monthly compounding. Real cards may have changing rates, fees, or promotional periods."),
    );
  }

  function planCard(sim) {
    return card(
      el("h2", {}, "Your Plan"),
      el("p.card-sub", {}, "Pick a strategy and how much extra you can put toward debt each month."),
      el("div.stack", {},
        field("Payoff strategy", select(data.strategy, STRATEGIES, (v) => { data.strategy = v; persist(); })),
        field("Extra monthly payment", moneyInput(data.extra, (v) => { data.extra = v; persist(); }), "On top of all minimum payments"),
        el("div.row", {},
          el("span.tag", {}, `Minimums: ${usd(sim.minSum)}/mo`),
          el("span.tag", {}, `Total budget: ${usd(sim.budget)}/mo`),
        ),
        sim.stalled && el("p.neg.small", {}, "⚠ At these payments the balance never clears — interest outpaces payments. Increase the extra payment."),
      ),
    );
  }

  function debtListCard() {
    const c = card(el("h2", {}, "Debts"), el("p.card-sub", {}, "List each balance you owe."));
    const list = el("div.list");
    data.debts.forEach((d) => {
      list.append(el("div.line-item", { style: "grid-template-columns:1fr auto auto" },
        el("div", {}, el("div.li-name", {}, d.name || "Untitled"),
          el("div.li-meta", {}, `${(+d.apr || 0).toFixed(2)}% APR · min ${usd(d.minPayment)}/mo`)),
        el("div.li-amount", {}, usd(d.balance)),
        deleteBtn(() => { data.debts = data.debts.filter((x) => x.id !== d.id); persist(); }),
      ));
    });
    if (!data.debts.length) list.append(empty("💳", "No debts added — add one below to plan your payoff."));
    c.append(list, el("hr.divider"), addRow());
    return c;
  }

  function addRow() {
    const draft = { name: "", balance: 0, apr: 0, minPayment: 0 };
    return el("div.stack", {},
      field("Name", textInput("", (v) => (draft.name = v), "e.g. Visa, Student loan")),
      el("div.form-grid", {},
        field("Balance", moneyInput("", (v) => (draft.balance = v))),
        field("APR", moneyInput("", (v) => (draft.apr = v), { suffix: "%" })),
      ),
      field("Minimum payment", moneyInput("", (v) => (draft.minPayment = v))),
      button("+ Add debt", () => {
        if (!draft.name && !draft.balance) return;
        data.debts.push({ id: uid(), ...draft });
        persist();
      }, "secondary"),
    );
  }

  function payoffCard(sim) {
    const ordered = [...data.debts]
      .map((d) => ({ name: d.name || "Untitled", balance: +d.balance || 0, apr: +d.apr || 0, month: sim.payoff[d.id] }))
      .sort((a, b) => (a.month || 9999) - (b.month || 9999));
    const tbody = el("tbody");
    ordered.forEach((d, i) => {
      tbody.append(el("tr", {},
        el("td", {}, `${i + 1}. ${d.name}`),
        el("td", {}, usd(d.balance)),
        el("td", {}, d.apr.toFixed(2) + "%"),
        el("td", {}, d.month ? monthsToWords(d.month) : "—"),
      ));
    });
    return card(
      el("h2", {}, "Payoff Order"),
      el("p.card-sub", {}, `Order your debts clear under the ${data.strategy} method.`),
      el("table.data", {},
        el("thead", {}, el("tr", {}, el("th", {}, "Debt"), el("th", {}, "Balance"), el("th", {}, "APR"), el("th", {}, "Paid off in"))),
        tbody,
      ),
    );
  }

  function chartCard(sim) {
    const step = Math.max(1, Math.round(sim.series.length / 24));
    const pts = sim.series.filter((s, i) => i % step === 0 || i === sim.series.length - 1)
      .map((s) => ({ label: s.month % 12 === 0 ? `${s.month / 12}y` : String(s.month), value: Math.round(s.balance) }));
    return card(el("h2", {}, "Balance Over Time"), el("p.card-sub", {}, "Total debt remaining each month."), lineChart(pts));
  }

  draw();
}
