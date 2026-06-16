// Debt payoff simulation: snowball (lowest balance first) vs.
// avalanche (highest APR first), with rolled-over payments and extra.

const ACTIVE = (d) => d.balance > 0.005;

// debts: [{ id, name, balance, apr, minPayment }]
// opts: { strategy: "avalanche"|"snowball", extra }
export function simulateDebt(debts, { strategy = "avalanche", extra = 0 } = {}) {
  const active = debts.map((d) => ({ id: d.id, name: d.name, apr: +d.apr || 0, minPayment: +d.minPayment || 0, balance: +d.balance || 0 }));
  const minSum = active.reduce((t, d) => t + d.minPayment, 0);
  const budget = minSum + (+extra || 0);

  let month = 0, totalInterest = 0, totalPaid = 0, stalled = false;
  const startBal = active.reduce((t, d) => t + d.balance, 0);
  const series = [{ month: 0, balance: startBal }];
  const payoff = {};

  const priority = () => active.filter(ACTIVE).sort((a, b) =>
    strategy === "snowball" ? a.balance - b.balance : b.apr - a.apr || a.balance - b.balance);

  while (active.some(ACTIVE)) {
    month++;
    if (month > 600) { stalled = true; break; }

    // Accrue monthly interest.
    for (const d of active) {
      if (!ACTIVE(d)) continue;
      const i = d.balance * (d.apr / 100 / 12);
      d.balance += i; totalInterest += i;
    }

    let remaining = budget;
    // Pay each debt's minimum.
    for (const d of active) {
      if (!ACTIVE(d)) continue;
      const pay = Math.min(d.minPayment, d.balance, remaining);
      d.balance -= pay; remaining -= pay; totalPaid += pay;
    }
    // Throw everything left at the priority debt(s).
    for (const d of priority()) {
      if (remaining <= 0.005) break;
      const pay = Math.min(remaining, d.balance);
      d.balance -= pay; remaining -= pay; totalPaid += pay;
    }

    for (const d of active) if (!ACTIVE(d) && !payoff[d.id]) payoff[d.id] = month;

    const totalBal = active.reduce((t, d) => t + Math.max(0, d.balance), 0);
    series.push({ month, balance: totalBal });

    // Budget can't outpace interest — bail out.
    if (totalBal >= series[series.length - 2].balance - 0.01) { stalled = true; break; }
  }

  return { months: month, totalInterest, totalPaid, series, payoff, stalled, budget, minSum };
}

// Baseline: every debt paid at its own minimum, independently, no rollover.
export function minimumOnly(debts) {
  let totalInterest = 0, maxMonth = 0, stalled = false;
  for (const raw of debts) {
    let bal = +raw.balance || 0;
    const r = (+raw.apr || 0) / 100 / 12;
    const m = +raw.minPayment || 0;
    let month = 0;
    while (bal > 0.005) {
      month++;
      if (month > 600) { stalled = true; break; }
      const i = bal * r;
      bal += i; totalInterest += i;
      const pay = Math.min(m, bal);
      if (pay <= i + 0.005) { stalled = true; break; } // min doesn't cover interest
      bal -= pay;
    }
    maxMonth = Math.max(maxMonth, month);
  }
  return { months: maxMonth, totalInterest, stalled };
}

export function monthsToWords(months) {
  if (!isFinite(months)) return "never";
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(" ") || "0 mo";
}
