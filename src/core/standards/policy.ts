import type { StandardsPolicy, Warning } from '../types';

/**
 * Compliance warnings whose severity is governed by the standards policy.
 * These are code-compliance checks derived from NEC 690/705 and IEC 62548.
 * Engineering safety warnings (cable ampacity, infeasible PV string,
 * inverter voltage mismatch, battery discharge) are never relaxed.
 */
const STANDARD_CODE_SET = new Set([
  'NEC690-7-VOC',
  'NEC690-8-ISC',
  'NEC690-9-FUSE',
  'NEC705-14-INV',
  'NEC705-12-BACKFEED',
  'IEC62548-DROP-DC',
  'IEC62548-DROP-AC',
  'IEC62548-AMPACITY',
]);

export function isStandardComplianceWarning(warning: Warning): boolean {
  return STANDARD_CODE_SET.has(warning.code);
}

/**
 * Apply the user's standards policy to a list of compliance warnings:
 * - 'strict'   unchanged;
 * - 'advisory' standards-derived errors are downgraded to warnings;
 * - 'off'      standards-derived checks are removed entirely.
 * Safety/feasibility warnings always survive regardless of policy.
 */
export function applyStandardsPolicy(
  warnings: Warning[],
  policy: StandardsPolicy | undefined,
): Warning[] {
  if (policy === undefined || policy === 'strict') return warnings;
  if (policy === 'off') return warnings.filter((w) => !isStandardComplianceWarning(w));
  return warnings.map((w) =>
    isStandardComplianceWarning(w) && w.severity === 'error' ? { ...w, severity: 'warning' } : w,
  );
}
