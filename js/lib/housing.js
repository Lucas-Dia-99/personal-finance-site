// Mortgage, affordability and rent-vs-buy math.

// Level monthly principal & interest payment.
export function mortgagePayment(principal, annualRate, years) {
  const r = annualRate / 100 / 12, n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// Full amortization with optional extra monthly principal.
// Returns payment, months, totalInterest, balance series and yearly points.
export function amortization(principal, annualRate, years, extra = 0) {
  const r = annualRate / 100 / 12, n = years * 12;
  const payment = mortgagePayment(principal, annualRate, years);
  let balance = principal, totalInterest = 0, month = 0;
  const series = [{ month: 0, balance }];
  const yearly = [{ year: 0, balance, interest: 0, principal: 0 }];
  let yrInterest = 0, yrPrincipal = 0;
  while (balance > 0.005 && month < n + 600) {
    month++;
    const interest = balance * r;
    let principalPaid = payment - interest + (+extra || 0);
    if (principalPaid > balance) principalPaid = balance;
    if (principalPaid <= 0) break; // payment can't cover interest
    balance -= principalPaid;
    totalInterest += interest;
    yrInterest += interest; yrPrincipal += principalPaid;
    series.push({ month, balance: Math.max(0, balance) });
    if (month % 12 === 0 || balance <= 0.005) {
      yearly.push({ year: Math.ceil(month / 12), balance: Math.max(0, balance), interest: yrInterest, principal: yrPrincipal });
      yrInterest = 0; yrPrincipal = 0;
    }
    if (balance <= 0.005) break;
  }
  return { payment, months: month, totalInterest, totalPaid: principal + totalInterest, series, yearly };
}

// Max affordable home price from income using DTI ratios (28/36 rule).
export function affordability({ grossMonthly, monthlyDebts, downPayment, rate, years, taxInsRate, frontDTI = 28, backDTI = 36 }) {
  const maxFront = grossMonthly * (frontDTI / 100);
  const maxBack = grossMonthly * (backDTI / 100) - monthlyDebts;
  const maxPITI = Math.max(0, Math.min(maxFront, maxBack));
  const r = rate / 100 / 12, n = years * 12;
  const piForLoan = (loan) => (r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n)));

  // Binary-search the home price (tax & insurance scale with price).
  let lo = downPayment, hi = 10_000_000;
  for (let i = 0; i < 70; i++) {
    const price = (lo + hi) / 2;
    const loan = Math.max(0, price - downPayment);
    const piti = piForLoan(loan) + (price * (taxInsRate / 100)) / 12;
    if (piti > maxPITI) hi = price; else lo = price;
  }
  const price = (lo + hi) / 2;
  const loan = Math.max(0, price - downPayment);
  return { maxPITI, price, loan, pi: piForLoan(loan), taxInsMonthly: (price * (taxInsRate / 100)) / 12, limitedBy: maxBack < maxFront ? "debt-to-income" : "housing ratio" };
}

/*
 * Rent vs. buy over a horizon. Both scenarios assume the same monthly housing
 * budget; whatever isn't spent is invested. The buyer also ends with home
 * equity (net of selling costs); the renter starts with the buyer's upfront
 * cash already invested.
 */
export function rentVsBuy(p) {
  const months = p.years * 12;
  const loan = Math.max(0, p.price - p.downPayment);
  const payment = mortgagePayment(loan, p.mortgageRate, p.loanTerm);
  const mRate = p.mortgageRate / 100 / 12;
  const invMonthly = Math.pow(1 + p.investReturn / 100, 1 / 12) - 1;

  const upfront = p.downPayment + p.price * (p.closingPct / 100);
  let balance = loan;
  let homeValue = p.price;
  let rent = p.monthlyRent;
  let buyerInvest = 0;            // buyer invests budget surplus
  let renterInvest = upfront;     // renter invests the cash a buyer would've put down
  const series = [];

  for (let m = 1; m <= months; m++) {
    const interest = balance * mRate;
    const principalPaid = Math.min(Math.max(0, payment - interest), balance);
    balance -= principalPaid;

    const ownMonthly = payment + (homeValue * (p.propTaxRate + p.insuranceRate + p.maintenanceRate) / 100) / 12 + p.hoa;
    const rentMonthly = rent + p.rentersInsurance;
    const budget = Math.max(ownMonthly, rentMonthly);

    buyerInvest = buyerInvest * (1 + invMonthly) + (budget - ownMonthly);
    renterInvest = renterInvest * (1 + invMonthly) + (budget - rentMonthly);

    if (m % 12 === 0) {
      homeValue *= 1 + p.appreciation / 100;
      rent *= 1 + p.rentGrowth / 100;
      const equity = homeValue * (1 - p.sellingPct / 100) - balance;
      series.push({ year: m / 12, buy: equity + buyerInvest, rent: renterInvest });
    }
  }
  const final = series[series.length - 1] || { buy: 0, rent: 0 };
  const breakeven = series.find((s) => s.buy >= s.rent);
  return { series, buyNet: final.buy, rentNet: final.rent, payment, breakevenYear: breakeven ? breakeven.year : null };
}
