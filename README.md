# Ledgerline — Personal Finance

A private, offline-first personal finance dashboard. It runs entirely in the
browser as a static site — **no build step, no backend, no accounts**. All data
is stored in your browser's `localStorage`, so nothing ever leaves your device.

## Features

| Section | What it does |
| --- | --- |
| **Dashboard** | At-a-glance summary of net worth, monthly cash flow, savings rate and goal progress. |
| **Net Worth** | Track assets & liabilities by category and save dated snapshots to chart your trend over time. |
| **Cash Flow** | Log income and expenses at any frequency (normalized to monthly), with a spending-by-category breakdown and savings rate. |
| **Budget vs. Actual** | Set monthly limits per category, log spending, and track real spending against budget with month-by-month navigation. |
| **Savings Goals** | Set targets, track progress, and get an ETA or the monthly amount needed to hit a target date. |
| **Debt Payoff** | Compare avalanche vs. snowball strategies, see payoff order/date, total interest, and what extra payments save. |
| **Retirement** | Project your nest egg with compound growth, inflation-adjusted value, and 4%-rule retirement income. |
| **FIRE / Coast FIRE** | Your FIRE number, years to financial independence, and whether you've hit Coast FIRE — seeded from your Cash Flow & Net Worth. |
| **Paycheck** | Estimate take-home pay after federal/state income tax, FICA, 401(k) and pre-tax benefits, with a full per-paycheck breakdown. |
| **401(k) Impact** | See how much a pre-tax contribution *actually* costs your paycheck after tax deferral, plus employer match and IRS limit checks. |
| **Roth vs Traditional** | Compare after-tax retirement outcomes of pre-tax vs. post-tax contributions at your current and expected tax rates. |
| **Data & Backup** | Export all data to a JSON file and restore it later — protects against browser data loss. |

## Running it

It's a static site — just open `index.html` with any static file server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(ES modules require `http://`, so opening the file directly with `file://`
won't work in some browsers — use a local server.)

Deploys as-is to GitHub Pages or any static host.

## Architecture

- **Vanilla HTML/CSS/ES modules** — zero dependencies, framework-free.
- `js/app.js` — hash-based router and app shell.
- `js/views/*.js` — one module per feature screen.
- `js/lib/` — `tax.js` (federal income tax, FICA, paycheck), `finance.js`
  (time-value-of-money helpers), and `debt.js` (payoff simulation).
- `js/data/tax.js` — editable tax constants (2025 IRS figures).
- `js/ui.js`, `js/chart.js`, `js/store.js`, `js/format.js` — shared helpers,
  self-contained SVG charts, `localStorage` wrapper, and formatters.

## Disclaimer

Tax and projection figures are **estimates for planning only** and are not
financial or tax advice. The paycheck model uses federal tables, a flat state
rate and the standard deduction; it does not model local taxes, credits, or
every withholding. Verify important numbers independently.
