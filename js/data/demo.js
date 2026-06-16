// A coherent sample dataset so the app can be explored instantly.
import { todayISO } from "../format.js";

let n = 0;
const id = () => "demo" + (n++).toString(36);
const ym = todayISO().slice(0, 7);

export function buildDemo() {
  return {
    profile: { salary: 95000, filing: "single", periods: "26", age: 32, retireAge: 65, stateRate: 5 },

    networth: {
      assets: [
        { id: id(), name: "Checking", category: "Checking", value: 4200 },
        { id: id(), name: "High-yield savings", category: "Savings", value: 15000 },
        { id: id(), name: "Brokerage", category: "Investments", value: 38000 },
        { id: id(), name: "401(k)", category: "Retirement", value: 52000 },
        { id: id(), name: "Car", category: "Vehicle", value: 18000 },
      ],
      liabilities: [
        { id: id(), name: "Auto loan", category: "Auto loan", value: 12000 },
        { id: id(), name: "Visa", category: "Credit card", value: 3500 },
        { id: id(), name: "Student loan", category: "Student loan", value: 21000 },
      ],
      history: [
        { id: id(), date: shift(-120), assets: 98000, liabilities: 44000, net: 54000 },
        { id: id(), date: shift(-60), assets: 115000, liabilities: 40000, net: 75000 },
        { id: id(), date: todayISO(), assets: 127200, liabilities: 36500, net: 90700 },
      ],
    },

    cashflow: {
      income: [{ id: id(), name: "Net paycheck", category: "Salary", amount: 5400, frequency: "monthly" }],
      expenses: [
        { id: id(), name: "Rent", category: "Housing", amount: 1850, frequency: "monthly" },
        { id: id(), name: "Utilities", category: "Utilities", amount: 220, frequency: "monthly" },
        { id: id(), name: "Groceries", category: "Groceries", amount: 520, frequency: "monthly" },
        { id: id(), name: "Car + gas", category: "Transport", amount: 260, frequency: "monthly" },
        { id: id(), name: "Insurance", category: "Insurance", amount: 180, frequency: "monthly" },
        { id: id(), name: "Streaming", category: "Subscriptions", amount: 55, frequency: "monthly" },
        { id: id(), name: "Dining out", category: "Dining", amount: 300, frequency: "monthly" },
        { id: id(), name: "Gym", category: "Health", amount: 45, frequency: "monthly" },
      ],
    },

    savings: {
      goals: [
        { id: id(), name: "Emergency fund", target: 18000, saved: 15000, monthly: 300, deadline: "" },
        { id: id(), name: "House down payment", target: 60000, saved: 12000, monthly: 700, deadline: shift(1095) },
        { id: id(), name: "Vacation", target: 4000, saved: 1500, monthly: 200, deadline: shift(240) },
      ],
    },

    debt: {
      strategy: "avalanche", extra: 300,
      debts: [
        { id: id(), name: "Visa", balance: 3500, apr: 22.9, minPayment: 90 },
        { id: id(), name: "Auto loan", balance: 12000, apr: 6.4, minPayment: 280 },
        { id: id(), name: "Student loan", balance: 21000, apr: 5.2, minPayment: 230 },
      ],
    },

    budget: {
      budgets: { Housing: 1850, Utilities: 220, Groceries: 520, Transport: 260, Insurance: 180, Subscriptions: 55, Dining: 300, Health: 45 },
      transactions: [
        { id: id(), date: ym + "-02", category: "Groceries", amount: 128, note: "Costco", recurring: false },
        { id: id(), date: ym + "-05", category: "Dining", amount: 64, note: "Dinner out", recurring: false },
        { id: id(), date: ym + "-01", category: "Housing", amount: 1850, note: "Rent", recurring: true },
        { id: id(), date: ym + "-09", category: "Transport", amount: 48, note: "Gas", recurring: false },
      ],
    },
  };
}

function shift(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
