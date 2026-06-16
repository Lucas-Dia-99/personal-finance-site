import { el, clear, pageHead, card, stat, field, textInput, moneyInput, select, button, deleteBtn, progressBar } from "../ui.js";
import { load, save, uid } from "../store.js";
import { usd, pct } from "../format.js";
import { toMonthly } from "../lib/finance.js";
import { barChart } from "../chart.js";

const KEY = "cashflow";
const DEFAULT = { income: [], expenses: [] };

const FREQ = [
  ["monthly", "Monthly"], ["biweekly", "Bi-weekly"], ["weekly", "Weekly"],
  ["semimonthly", "Semi-monthly"], ["quarterly", "Quarterly"], ["annual", "Annual"],
];
const EXPENSE_CATS = ["Housing", "Utilities", "Groceries", "Transport", "Insurance", "Debt", "Subscriptions", "Dining", "Health", "Savings", "Other"];
const INCOME_CATS = ["Salary", "Side income", "Investment", "Other"];

const monthlyTotal = (items) => items.reduce((t, i) => t + toMonthly(+i.amount || 0, i.frequency), 0);

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function persist() { save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const income = monthlyTotal(data.income);
    const expenses = monthlyTotal(data.expenses);
    const net = income - expenses;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;

    root.append(
      pageHead("Cash Flow", "Map your monthly money in and out. Everything is normalized to a monthly figure."),
      el("div.grid.grid-4", {},
        card(stat("Monthly Income", usd(income), { tone: "pos" })),
        card(stat("Monthly Expenses", usd(expenses), { tone: "neg" })),
        card(stat("Net Cash Flow", usd(net), { sub: "per month", tone: net >= 0 ? "pos" : "neg" })),
        card(stat("Savings Rate", pct(savingsRate), { sub: net >= 0 ? "of income saved" : "spending over income" })),
      ),
    );

    if (data.expenses.length) {
      const byCat = {};
      data.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + toMonthly(+e.amount || 0, e.frequency); });
      const bars = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
      root.append(card(el("h2", {}, "Monthly Spending by Category"), el("p.card-sub", {}, "Where the money goes."), barChart(bars)));
    }

    root.append(el("div.grid.grid-2", { style: "margin-top:18px" },
      listCard("Income", "income", INCOME_CATS, "pos"),
      listCard("Expenses", "expenses", EXPENSE_CATS, "neg"),
    ));

    if (income > 0) {
      const annual = net * 12;
      root.append(card(
        el("h2", {}, "Annual Outlook"),
        el("p.card-sub", {}, "Projected over 12 months at the current pace."),
        el("div.grid.grid-3", {},
          stat("Annual income", usd(income * 12)),
          stat("Annual expenses", usd(expenses * 12)),
          stat(net >= 0 ? "Annual surplus" : "Annual shortfall", usd(annual), { tone: net >= 0 ? "pos" : "neg" }),
        ),
        el("div", { style: "margin-top:14px" },
          el("div.spread.small.muted", {}, el("span", {}, "Spending vs. income"), el("span", {}, pct(income ? (expenses / income) * 100 : 0, 0))),
          progressBar(income ? expenses / income : 0, net >= 0),
        ),
      ));
    }
  }

  function listCard(title, kind, cats, tone) {
    const items = data[kind];
    const c = card(
      el("div.spread", {}, el("h2", {}, title), el("span.pill." + tone, {}, usd(monthlyTotal(items)) + "/mo")),
    );
    const list = el("div.list");
    items.forEach((it) => {
      list.append(el("div.line-item", {},
        el("div", {}, el("div.li-name", {}, it.name || "Untitled"),
          el("div.li-meta", {}, `${it.category} · ${FREQ.find((f) => f[0] === it.frequency)?.[1] || it.frequency}`)),
        el("div.li-amount", {}, usd(toMonthly(+it.amount || 0, it.frequency)) + "/mo"),
        deleteBtn(() => { data[kind] = items.filter((x) => x.id !== it.id); persist(); }),
      ));
    });
    if (!items.length) list.append(el("p.muted.small", {}, "Nothing added yet."));
    c.append(list, el("hr.divider"), addRow(kind, cats));
    return c;
  }

  function addRow(kind, cats) {
    const draft = { name: "", category: cats[0], amount: 0, frequency: "monthly" };
    return el("div.stack", {},
      field("Name", textInput("", (v) => (draft.name = v), kind === "income" ? "e.g. Paycheck" : "e.g. Rent")),
      el("div.form-grid", {},
        field("Category", select(draft.category, cats.map((c) => [c, c]), (v) => (draft.category = v))),
        field("Frequency", select(draft.frequency, FREQ, (v) => (draft.frequency = v))),
      ),
      field("Amount", moneyInput("", (v) => (draft.amount = v))),
      button("+ Add", () => {
        if (!draft.name && !draft.amount) return;
        data[kind].push({ id: uid(), ...draft });
        persist();
      }, "secondary"),
    );
  }

  draw();
}
