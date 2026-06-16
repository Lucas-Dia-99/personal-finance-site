import { el, clear, pageHead, card, field, moneyInput, select } from "../ui.js";
import { getProfile, saveProfile } from "../profile.js";
import { FILING_OPTIONS, FREQUENCY } from "../data/tax.js";

export default function render(root) {
  function draw() {
    const p = getProfile();
    clear(root);
    root.append(
      pageHead("Profile", "Set these once. The Paycheck, 401(k), Roth, Retirement and FIRE tools can pull them in so you don't re-enter the basics."),
      card(
        el("h2", {}, "Your Details"),
        el("div.stack", {},
          field("Annual gross salary", moneyInput(p.salary, (v) => saveProfile({ salary: v }))),
          el("div.form-grid", {},
            field("Filing status", select(p.filing, FILING_OPTIONS, (v) => saveProfile({ filing: v }))),
            field("Pay frequency", select(p.periods, FREQUENCY, (v) => saveProfile({ periods: v }))),
          ),
          el("div.form-grid", {},
            field("Current age", moneyInput(p.age, (v) => saveProfile({ age: v }), { suffix: "yrs" })),
            field("Target retirement age", moneyInput(p.retireAge, (v) => saveProfile({ retireAge: v }), { suffix: "yrs" })),
          ),
          field("State income tax rate", moneyInput(p.stateRate, (v) => saveProfile({ stateRate: v }), { suffix: "%" }), "Flat rate (simplified)"),
        ),
      ),
      el("p.disclaimer", {}, "Each calculator keeps its own copy once you tweak it there — use the “Use my profile” button in a tool to re-sync these values."),
    );
  }
  draw();
}
