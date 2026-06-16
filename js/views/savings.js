import { el, clear, pageHead, card, stat, field, textInput, moneyInput, dateInput, button, deleteBtn, empty, progressBar } from "../ui.js";
import { load, save, uid } from "../store.js";
import { usd, pct, formatDate } from "../format.js";
import { monthsToTarget, requiredMonthly } from "../lib/finance.js";

const KEY = "savings";
const DEFAULT = { goals: [] };

export default function render(root) {
  const data = load(KEY, DEFAULT);
  function persist() { save(KEY, data); draw(); }

  function draw() {
    clear(root);
    const totalTarget = data.goals.reduce((t, g) => t + (+g.target || 0), 0);
    const totalSaved = data.goals.reduce((t, g) => t + (+g.saved || 0), 0);
    const overall = totalTarget > 0 ? totalSaved / totalTarget : 0;

    root.append(
      pageHead("Savings Goals", "Set targets, track progress, and see when you'll get there."),
      el("div.grid.grid-3", {},
        card(stat("Total saved", usd(totalSaved), { tone: "pos" })),
        card(stat("Total target", usd(totalTarget))),
        card(stat("Overall progress", pct(overall * 100, 0),
          { sub: el("div", { style: "margin-top:8px" }, progressBar(overall, overall >= 1)) })),
      ),
    );

    const grid = el("div.grid.grid-2", { style: "margin-top:18px" });
    if (!data.goals.length) {
      grid.append(card(empty("🎯", "No goals yet. Add your first savings goal below.")));
    }
    data.goals.forEach((g) => grid.append(goalCard(g)));
    root.append(grid, addCard());
  }

  function goalCard(g) {
    const frac = g.target > 0 ? g.saved / g.target : 0;
    const remaining = Math.max(0, g.target - g.saved);
    const months = monthsToTarget(+g.target, +g.saved, +g.monthly);
    const done = frac >= 1;

    let etaLine;
    if (done) etaLine = el("span.pill.pos", {}, "Goal reached 🎉");
    else if (months === Infinity) etaLine = el("span.muted.small", {}, "Add a monthly amount to see an ETA.");
    else {
      const eta = new Date(); eta.setMonth(eta.getMonth() + months);
      etaLine = el("span.small", {}, `${months} mo left · ETA ${formatDate(eta.toISOString())}`);
    }

    let deadlineNote = null;
    if (g.deadline && !done) {
      const monthsLeft = monthsUntil(g.deadline);
      if (monthsLeft > 0) {
        const need = requiredMonthly(+g.target, +g.saved, monthsLeft);
        const onTrack = (+g.monthly) >= need - 0.5;
        deadlineNote = el("p.small", { class: onTrack ? "pos" : "neg" },
          onTrack ? `On track for ${formatDate(g.deadline)} ✓` : `Need ${usd(need)}/mo to hit ${formatDate(g.deadline)} (saving ${usd(+g.monthly)}/mo)`);
      } else {
        deadlineNote = el("p.small.neg", {}, `Target date ${formatDate(g.deadline)} has passed.`);
      }
    }

    return card(
      el("div.spread", {}, el("h2", {}, g.name || "Untitled goal"), deleteBtn(() => { data.goals = data.goals.filter((x) => x.id !== g.id); persist(); })),
      el("div.spread.small.muted", { style: "margin:10px 0 6px" },
        el("span", {}, `${usd(+g.saved)} of ${usd(+g.target)}`), el("span", {}, pct(frac * 100, 0))),
      progressBar(frac, done),
      el("div.grid.grid-2", { style: "margin-top:14px" },
        stat("Remaining", usd(remaining), { tone: done ? "pos" : null }),
        stat("Saving", usd(+g.monthly) + "/mo"),
      ),
      el("div", { style: "margin-top:10px" }, etaLine),
      deadlineNote,
      el("hr.divider"),
      el("div.form-grid", {},
        field("Update saved", moneyInput(g.saved, (v) => { g.saved = v; persist(); })),
        field("Monthly", moneyInput(g.monthly, (v) => { g.monthly = v; persist(); })),
      ),
    );
  }

  function addCard() {
    const draft = { name: "", target: 0, saved: 0, monthly: 0, deadline: "" };
    return card(
      el("h2", {}, "Add a Goal"),
      el("div.stack", {},
        field("Goal name", textInput("", (v) => (draft.name = v), "e.g. Emergency fund, House down payment")),
        el("div.form-grid", {},
          field("Target amount", moneyInput("", (v) => (draft.target = v))),
          field("Already saved", moneyInput("", (v) => (draft.saved = v))),
        ),
        el("div.form-grid", {},
          field("Monthly contribution", moneyInput("", (v) => (draft.monthly = v))),
          field("Target date (optional)", dateInput("", (v) => (draft.deadline = v))),
        ),
        button("+ Add goal", () => {
          if (!draft.name || !draft.target) return;
          data.goals.push({ id: uid(), ...draft });
          persist();
        }),
      ),
    );
  }

  draw();
}

function monthsUntil(iso) {
  const now = new Date(), then = new Date(iso);
  return (then.getFullYear() - now.getFullYear()) * 12 + (then.getMonth() - now.getMonth());
}
