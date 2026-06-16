import { el, clear, pageHead, card, stat, field, textInput, moneyInput, select, dateInput, button, deleteBtn, progressBar, empty } from "../ui.js";
import { load, save, uid } from "../store.js";
import { usd, pct, formatDate, todayISO } from "../format.js";
import { toMonthly } from "../lib/finance.js";

const KEY = "budget";
const DEFAULT = { budgets: {}, transactions: [] };
const CATS = ["Housing", "Utilities", "Groceries", "Transport", "Insurance", "Debt", "Subscriptions", "Dining", "Health", "Shopping", "Entertainment", "Other"];

const monthKey = (iso) => (iso || "").slice(0, 7);
const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function render(root) {
  const data = load(KEY, DEFAULT);
  let activeMonth = todayISO().slice(0, 7);
  function persist() { save(KEY, data); draw(); }

  // Monthly expense total per category from the Cash Flow tool.
  function cashFlowByCat() {
    const cf = load("cashflow", { expenses: [] });
    const byCat = {};
    cf.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + toMonthly(+e.amount || 0, e.frequency); });
    return byCat;
  }
  const allCats = () => [...new Set([...CATS, ...Object.keys(cashFlowByCat())])];

  function importFromCashFlow() {
    const cf = cashFlowByCat();
    const keys = Object.keys(cf);
    if (!keys.length) { alert("No Cash Flow expenses to import yet. Add some in the Cash Flow tool first."); return; }
    const hasExisting = Object.values(data.budgets).some((v) => +v > 0);
    if (hasExisting && !confirm("Set each category budget to your Cash Flow expense amount? This overwrites existing limits.")) return;
    keys.forEach((k) => { data.budgets[k] = Math.round(cf[k]); });
    persist();
  }

  function draw() {
    clear(root);
    // Recurring items count in their start month and every month after.
    const txns = data.transactions.filter((t) =>
      t.recurring ? monthKey(t.date) <= activeMonth : monthKey(t.date) === activeMonth);
    const spentByCat = {};
    txns.forEach((t) => { spentByCat[t.category] = (spentByCat[t.category] || 0) + (+t.amount || 0); });

    const totalBudget = Object.values(data.budgets).reduce((a, b) => a + (+b || 0), 0);
    const totalSpent = txns.reduce((t, x) => t + (+x.amount || 0), 0);
    const remaining = totalBudget - totalSpent;

    root.append(
      pageHead("Budget vs. Actual", "Set a monthly limit per category, log spending, and watch where you stand."),
      monthBar(),
      el("div.grid.grid-3", {},
        card(stat("Budgeted", usd(totalBudget))),
        card(stat("Spent", usd(totalSpent), { tone: "neg" })),
        card(stat(remaining >= 0 ? "Left to spend" : "Over budget", usd(Math.abs(remaining)), { tone: remaining >= 0 ? "pos" : "neg" })),
      ),
      el("div.grid.grid-2", { style: "margin-top:18px" }, budgetCard(spentByCat), logCard(txns)),
    );
  }

  function monthBar() {
    return card(el("div.spread", {},
      button("‹ Prev", () => { activeMonth = shiftMonth(activeMonth, -1); draw(); }, "ghost btn-sm"),
      el("h2", { style: "margin:0" }, monthLabel(activeMonth)),
      button("Next ›", () => { activeMonth = shiftMonth(activeMonth, 1); draw(); }, "ghost btn-sm"),
    ));
  }

  function budgetCard(spentByCat) {
    const cfByCat = cashFlowByCat();
    const hasCashFlow = Object.keys(cfByCat).length > 0;
    const c = card(
      el("div.spread", {}, el("h2", {}, "Category Budgets"),
        hasCashFlow && button("⇣ Import from Cash Flow", importFromCashFlow, "ghost btn-sm")),
      el("p.card-sub", {}, "Limits apply every month. Bars fill as you log spending."),
    );
    const rows = el("div.stack");
    const shown = allCats().filter((cat) => data.budgets[cat] > 0 || spentByCat[cat] > 0 || cfByCat[cat] > 0);
    if (!shown.length) rows.append(el("p.muted.small", {}, "Set a budget below, or import your Cash Flow expenses."));
    shown.forEach((cat) => {
      const budget = +data.budgets[cat] || 0;
      const spent = spentByCat[cat] || 0;
      const suggested = Math.round(cfByCat[cat] || 0);
      const frac = budget > 0 ? spent / budget : (spent > 0 ? 1 : 0);
      const over = budget > 0 && spent > budget;
      const bar = over
        ? el("div.progress", {}, el("span", { style: "width:100%;background:var(--negative)" }))
        : progressBar(frac, true);
      let footer = null;
      if (budget > 0) {
        footer = el("div.small.muted", { style: "margin-top:2px" }, over ? `${usd(spent - budget)} over` : `${usd(budget - spent)} left · ${pct(frac * 100, 0)}`);
      } else if (suggested > 0) {
        footer = el("div.small", { style: "margin-top:2px" },
          el("span.muted", {}, `Suggested ${usd(suggested)}/mo from Cash Flow · `),
          el("a", { href: "#", onClick: (e) => { e.preventDefault(); data.budgets[cat] = suggested; persist(); } }, "apply"));
      }
      rows.append(el("div", {},
        el("div.spread.small", {}, el("span", { style: "font-weight:600" }, cat),
          el("span", { class: over ? "neg" : "muted" }, `${usd(spent)} / ${usd(budget)}`)),
        bar, footer,
      ));
    });
    c.append(rows, el("hr.divider"), budgetEditor());
    return c;
  }

  function budgetEditor() {
    const draft = { category: CATS[0], amount: data.budgets[CATS[0]] || 0 };
    const amountInput = moneyInput(draft.amount, (v) => (draft.amount = v));
    return el("div.stack", {},
      el("p.card-sub", { style: "margin:0" }, "Set or update a category limit"),
      el("div.form-grid", {},
        field("Category", select(draft.category, allCats().map((c) => [c, c]), (v) => {
          draft.category = v;
          const inp = amountInput.querySelector("input");
          inp.value = data.budgets[v] || "";
          draft.amount = data.budgets[v] || 0;
        })),
        field("Monthly limit", amountInput),
      ),
      button("Save limit", () => { data.budgets[draft.category] = draft.amount; persist(); }, "secondary"),
    );
  }

  function logCard(txns) {
    const c = card(
      el("div.spread", {}, el("h2", {}, "Spending Log"),
        el("div.row", { style: "gap:6px" }, csvImport(), button("⬇ CSV", () => exportCSV(txns), "ghost btn-sm"))),
      el("p.card-sub", {}, `Transactions in ${monthLabel(activeMonth)}.`));
    const list = el("div.list");
    [...txns].sort((a, b) => b.date.localeCompare(a.date)).forEach((t) => {
      list.append(el("div.line-item", {},
        el("div", {}, el("div.li-name", {}, t.note || t.category),
          el("div.li-meta", {}, `${t.category} · ${formatDate(t.date)}${t.recurring ? " · 🔁 recurring" : ""}`)),
        el("div.li-amount", {}, usd(t.amount)),
        deleteBtn(() => { data.transactions = data.transactions.filter((x) => x.id !== t.id); persist(); }),
      ));
    });
    if (!txns.length) list.append(empty("🧾", "No spending logged this month yet."));
    c.append(list, el("hr.divider"), addTxn());
    return c;
  }

  function csvImport() {
    const input = el("input", { type: "file", accept: ".csv,text/csv", style: "display:none" });
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const rows = parseCSV(reader.result);
        let added = 0;
        rows.forEach((r) => {
          const amount = parseFloat(String(r.amount || r.Amount || "").replace(/[^0-9.\-]/g, ""));
          if (!isFinite(amount) || amount === 0) return;
          const date = (r.date || r.Date || todayISO()).slice(0, 10);
          data.transactions.push({
            id: uid(), date, category: r.category || r.Category || "Other",
            amount: Math.abs(amount), note: r.note || r.Note || r.description || r.Description || "",
            recurring: /^(true|yes|1)$/i.test(String(r.recurring || "")),
          });
          added++;
        });
        if (added) { activeMonth = monthKey(todayISO()); persist(); }
        else alert("No rows imported. Expected columns: date, category, amount, note.");
      };
      reader.readAsText(file);
    });
    const label = el("label.btn.btn-ghost.btn-sm", { style: "cursor:pointer" }, "⬆ CSV");
    label.appendChild(input);
    return label;
  }

  function exportCSV(txns) {
    const header = "date,category,amount,note,recurring";
    const lines = txns.map((t) => [t.date, t.category, t.amount, csvCell(t.note || ""), t.recurring ? "true" : "false"].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `spending-${activeMonth}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function addTxn() {
    const draft = { date: todayISO(), category: CATS[0], amount: 0, note: "", recurring: false };
    if (monthKey(draft.date) !== activeMonth) draft.date = activeMonth + "-15";
    return el("div.stack", {},
      el("div.form-grid", {},
        field("Date", dateInput(draft.date, (v) => (draft.date = v))),
        field("Category", select(draft.category, allCats().map((c) => [c, c]), (v) => (draft.category = v))),
      ),
      el("div.form-grid", {},
        field("Amount", moneyInput("", (v) => (draft.amount = v))),
        field("Note (optional)", textInput("", (v) => (draft.note = v), "e.g. Groceries at Aldi")),
      ),
      el("label.field", { style: "flex-direction:row;align-items:center;gap:8px" },
        el("input", { type: "checkbox", style: "width:auto", onChange: (e) => (draft.recurring = e.target.checked) }),
        el("span", { style: "font-weight:500;color:var(--text)" }, "🔁 Repeats every month"),
      ),
      button("+ Log spending", () => {
        if (!draft.amount) return;
        data.transactions.push({ id: uid(), ...draft });
        activeMonth = monthKey(draft.date);
        persist();
      }),
    );
  }

  draw();
}

// Minimal CSV parser supporting quoted fields. Returns array of row objects
// keyed by header. Falls back gracefully on ragged rows.
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (!lines.length) return [];
  const splitRow = (line) => {
    const out = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = splitRow(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] || "").trim()));
    return obj;
  });
}

function csvCell(s) {
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
