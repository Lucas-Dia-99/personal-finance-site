import { TAX } from "../data/tax.js";

// Progressive federal income tax on taxable income.
export function federalIncomeTax(taxable, filing) {
  const brackets = TAX.brackets[filing] || TAX.brackets.single;
  let tax = 0;
  for (const br of brackets) {
    if (taxable <= br.from) break;
    const upper = br.to == null ? taxable : Math.min(taxable, br.to);
    tax += (upper - br.from) * br.rate;
  }
  return Math.max(0, tax);
}

// Marginal federal rate at a given taxable income.
export function marginalRate(taxable, filing) {
  const brackets = TAX.brackets[filing] || TAX.brackets.single;
  let rate = brackets[0].rate;
  for (const br of brackets) {
    if (taxable > br.from) rate = br.rate;
  }
  return rate;
}

// Social Security + Medicare (incl. additional Medicare surtax).
export function ficaTax(ficaWages, filing) {
  const { socialSecurity: ss, medicare } = TAX.fica;
  const socialSecurity = Math.min(ficaWages, ss.wageBase) * ss.rate;
  let medicareTax = ficaWages * medicare.rate;
  const threshold = medicare.addlThreshold[filing] ?? 200000;
  if (ficaWages > threshold) medicareTax += (ficaWages - threshold) * medicare.addlRate;
  return { socialSecurity, medicare: medicareTax, total: socialSecurity + medicareTax };
}

/*
 * Full annual paycheck breakdown.
 * Inputs (all annual unless noted):
 *   gross            gross wages
 *   filing           "single" | "married" | "hoh"
 *   pretax401k       pre-tax 401(k) contribution (reduces income & fed/state tax, NOT FICA)
 *   pretaxBenefits   Section-125 deductions e.g. health/HSA (reduces income, tax, AND FICA)
 *   stateRate        flat state income-tax rate (%) applied after pre-tax deductions
 */
export function paycheckBreakdown({ gross, filing, pretax401k = 0, pretaxBenefits = 0, stateRate = 0 }) {
  const std = TAX.standardDeduction[filing] ?? TAX.standardDeduction.single;
  const ficaWages = Math.max(0, gross - pretaxBenefits); // 401k is FICA-taxable
  const fica = ficaTax(ficaWages, filing);

  const fedTaxable = Math.max(0, gross - pretax401k - pretaxBenefits - std);
  const federal = federalIncomeTax(fedTaxable, filing);

  const stateTaxable = Math.max(0, gross - pretax401k - pretaxBenefits);
  const state = stateTaxable * (stateRate / 100);

  const totalPretax = pretax401k + pretaxBenefits;
  const totalTax = federal + state + fica.total;
  const net = gross - totalPretax - totalTax;

  return {
    gross, std, fedTaxable, federal, state, fica,
    pretax401k, pretaxBenefits, totalPretax, totalTax, net,
    marginal: marginalRate(fedTaxable, filing),
    effective: gross ? totalTax / gross : 0,
  };
}
