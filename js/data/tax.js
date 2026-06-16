// U.S. federal tax constants. 2025 tax-year figures (IRS).
// These are estimates for planning only — update yearly as IRS publishes new numbers.
export const TAX_YEAR = 2025;

const b = (rate, from, to) => ({ rate, from, to });

export const TAX = {
  standardDeduction: { single: 15000, married: 30000, hoh: 22500 },
  brackets: {
    single: [
      b(0.10, 0, 11925), b(0.12, 11925, 48475), b(0.22, 48475, 103350),
      b(0.24, 103350, 197300), b(0.32, 197300, 250525), b(0.35, 250525, 626350),
      b(0.37, 626350, null),
    ],
    married: [
      b(0.10, 0, 23850), b(0.12, 23850, 96950), b(0.22, 96950, 206700),
      b(0.24, 206700, 394600), b(0.32, 394600, 501050), b(0.35, 501050, 751600),
      b(0.37, 751600, null),
    ],
    hoh: [
      b(0.10, 0, 17000), b(0.12, 17000, 64850), b(0.22, 64850, 103350),
      b(0.24, 103350, 197300), b(0.32, 197300, 250500), b(0.35, 250500, 626350),
      b(0.37, 626350, null),
    ],
  },
  fica: {
    socialSecurity: { rate: 0.062, wageBase: 176100 },
    medicare: { rate: 0.0145, addlRate: 0.009, addlThreshold: { single: 200000, married: 250000, hoh: 200000 } },
  },
  // 401(k) employee elective-deferral limits.
  limit401k: { base: 23500, catchUp50: 7500, catchUp60to63: 11250 },
};

export const FILING_OPTIONS = [
  ["single", "Single"],
  ["married", "Married filing jointly"],
  ["hoh", "Head of household"],
];

// Pay frequency -> periods per year.
export const FREQUENCY = [
  ["12", "Monthly"],
  ["24", "Semi-monthly (2×/mo)"],
  ["26", "Bi-weekly (every 2 wks)"],
  ["52", "Weekly"],
  ["1", "Annual"],
];
