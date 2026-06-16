import { el, clear, pageHead, card, stat, field, textInput, moneyInput, select, button, deleteBtn, empty } from "../ui.js";
import { load, save, update, uid } from "../store.js";
import { usd, usdSigned, formatDate, todayISO } from "../format.js";
import { lineChart } from "../chart.js";

const KEY = "networth";
const DEFAULT = { assets: [], liabilities: [], history: [] };

const ASSET_CATS = ["Cash", "Checking", "Savings", "Investments", "Retirement", "Real estate", "Vehicle", "Other"];
const LIAB_CATS = ["Credit card", "Mortgage", "Student loan", "Auto loan", "Personal loan", "Other"];

const sum = (items) => items.reduce((t, i) => t + (+i.value || 0), 0);

export default function render(root) {
  const data = load(KEY, DEFAULT);

  function persist() { save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const assets = sum(data.assets);
    const liabilities = sum(data.liabilities);
    const net = assets - liabilities;

    const lastSnap = data.history[data.history.length - 1];
    const change = lastSnap ? net - lastSnap.net : 0;

    root.append(
      pageHead("Net Worth", "Track what you own and owe, then snapshot it over time."),
      el("div.grid.grid-3", {},
        card(stat("Total Assets", usd(assets), { tone: "pos" })),
        card(stat("Total Liabilities", usd(liabilities), { tone: "neg" })),
        card(stat("Net Worth", usd(net), {
          sub: data.history.length ? el("span.sub", {}, `${usdSigned(change)} since last snapshot`) : "No snapshots yet",
          tone: net >= 0 ? "pos" : "neg",
        })),
      ),
      historyCard(),
      el("div.grid.grid-2", { style: "margin-top:18px" },
        listCard("Assets", "assets", ASSET_CATS, "pos"),
        listCard("Liabilities", "liabilities", LIAB_CATS, "neg"),
      ),
    );
  }

  function historyCard() {
    const c = card(
      el("div.spread", {},
        el("div", {}, el("h2", {}, "History"), el("p.card-sub", {}, "Save a snapshot to chart your trend.")),
        button("📸 Save snapshot", saveSnapshot, "secondary"),
      ),
    );
    if (data.history.length >= 1) {
      c.append(lineChart(data.history.map((h) => ({ label: formatDate(h.date).replace(/,.*/, ""), value: h.net }))));
      const tbl = el("table.data", {},
        el("thead", {}, el("tr", {}, el("th", {}, "Date"), el("th", {}, "Assets"), el("th", {}, "Liabilities"), el("th", {}, "Net Worth"), el("th", {}, ""))),
      );
      const body = el("tbody");
      [...data.history].reverse().forEach((h) => {
        body.append(el("tr", {},
          el("td", {}, formatDate(h.date)),
          el("td", {}, usd(h.assets)),
          el("td", {}, usd(h.liabilities)),
          el("td", {}, usd(h.net)),
          el("td", {}, deleteBtn(() => { data.history = data.history.filter((x) => x.id !== h.id); persist(); })),
        ));
      });
      tbl.append(body);
      c.append(tbl);
    } else {
      c.append(empty("📈", "No snapshots yet — save your first to start the trend line."));
    }
    return c;
  }

  function saveSnapshot() {
    const assets = sum(data.assets), liabilities = sum(data.liabilities);
    const today = todayISO();
    const existing = data.history.find((h) => h.date === today);
    const snap = { assets, liabilities, net: assets - liabilities };
    if (existing) Object.assign(existing, snap);
    else data.history.push({ id: uid(), date: today, ...snap });
    persist();
  }

  function listCard(title, kind, cats, tone) {
    const items = data[kind];
    const c = card(
      el("div.spread", {}, el("h2", {}, title), el("span.pill." + tone, {}, usd(sum(items)))),
      el("p.card-sub", {}, kind === "assets" ? "Everything you own." : "Everything you owe."),
    );
    const list = el("div.list");
    items.forEach((it) => {
      list.append(el("div.line-item", {},
        el("div", {}, el("div.li-name", {}, it.name || "Untitled"), el("div.li-meta", {}, it.category)),
        el("div.li-amount", {}, usd(it.value)),
        deleteBtn(() => { data[kind] = items.filter((x) => x.id !== it.id); persist(); }),
      ));
    });
    if (!items.length) list.append(el("p.muted.small", {}, "Nothing added yet."));
    c.append(list, el("hr.divider"), addRow(kind, cats));
    return c;
  }

  function addRow(kind, cats) {
    const draft = { name: "", category: cats[0], value: 0 };
    return el("div.stack", {},
      field("Name", textInput("", (v) => (draft.name = v), kind === "assets" ? "e.g. Brokerage account" : "e.g. Visa card")),
      el("div.form-grid", {},
        field("Category", select(draft.category, cats.map((c) => [c, c]), (v) => (draft.category = v))),
        field("Value", moneyInput("", (v) => (draft.value = v))),
      ),
      button("+ Add", () => {
        if (!draft.name && !draft.value) return;
        data[kind].push({ id: uid(), ...draft });
        persist();
      }, "secondary"),
    );
  }

  draw();
}
