// General time-value-of-money helpers.

// Future value of a starting balance plus recurring contributions,
// compounded per period. ratePerPeriod is a decimal (e.g. 0.005 monthly).
export function futureValue(principal, contributionPerPeriod, ratePerPeriod, periods) {
  if (periods <= 0) return principal;
  const growth = Math.pow(1 + ratePerPeriod, periods);
  if (ratePerPeriod === 0) return principal + contributionPerPeriod * periods;
  const fvPrincipal = principal * growth;
  const fvContrib = contributionPerPeriod * ((growth - 1) / ratePerPeriod);
  return fvPrincipal + fvContrib;
}

// Year-by-year projection of a portfolio with monthly contributions.
// Returns [{ year, age, balance, contributed }] including the starting point.
export function projectBalance({ startBalance, monthlyContribution, annualReturn, years, startAge = null }) {
  const r = annualReturn / 100 / 12;
  const series = [];
  let balance = startBalance;
  let contributed = 0;
  series.push({ year: 0, age: startAge, balance, contributed });
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + monthlyContribution;
      contributed += monthlyContribution;
    }
    series.push({ year: y, age: startAge == null ? null : startAge + y, balance, contributed });
  }
  return series;
}

// Discount a nominal future amount to today's dollars.
export function realValue(nominal, annualInflation, years) {
  return nominal / Math.pow(1 + annualInflation / 100, years);
}

// Months to reach a target given a starting amount + monthly contribution
// and an optional monthly growth rate. Returns Infinity if unreachable.
export function monthsToTarget(target, current, monthly, annualReturn = 0) {
  if (current >= target) return 0;
  if (monthly <= 0 && annualReturn <= 0) return Infinity;
  const r = annualReturn / 100 / 12;
  let bal = current, months = 0;
  while (bal < target && months < 1200) {
    bal = bal * (1 + r) + monthly;
    months++;
  }
  return bal >= target ? months : Infinity;
}

// Level monthly contribution needed to reach target by a number of months.
export function requiredMonthly(target, current, months, annualReturn = 0) {
  if (months <= 0) return Math.max(0, target - current);
  const r = annualReturn / 100 / 12;
  const fvCurrent = current * Math.pow(1 + r, months);
  const remaining = target - fvCurrent;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / months;
  return remaining * r / (Math.pow(1 + r, months) - 1);
}

// Normalize an amount at a given frequency to a monthly figure.
export const PER_MONTH = { monthly: 1, weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, quarterly: 1 / 3, annual: 1 / 12, daily: 365 / 12 };
export function toMonthly(amount, frequency) {
  return amount * (PER_MONTH[frequency] ?? 1);
}
