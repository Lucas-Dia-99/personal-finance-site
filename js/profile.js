// Shared financial profile reused across the paycheck/retirement tools so
// salary, filing status, etc. only need to be entered once.
import { load, save } from "./store.js";

const KEY = "profile";
const DEFAULT = { salary: 85000, filing: "single", periods: "26", age: 35, retireAge: 65, stateRate: 5 };

export function getProfile() {
  return { ...DEFAULT, ...load(KEY, {}) };
}

export function saveProfile(patch) {
  return save(KEY, { ...getProfile(), ...patch });
}

export const PROFILE_DEFAULT = DEFAULT;
