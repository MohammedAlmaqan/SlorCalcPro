import type { Warning } from '../types';

/**
 * IEC 62548 (PV array design safety requirements).
 * Focus on voltage-drop limits and rooftop temperature derating.
 */
export function iecChecks(input: {
  pvVoltageDropPercent: number;
  dcVoltageDropLimitPercent: number;
  acVoltageDropPercent: number;
  acVoltageDropLimitPercent: number;
  ampacityPasses: boolean;
}): Warning[] {
  const warnings: Warning[] = [];

  if (input.pvVoltageDropPercent > input.dcVoltageDropLimitPercent) {
    warnings.push({
      code: 'IEC62548-DROP-DC',
      severity: 'warning',
      standard: 'IEC 62548',
      message: `PV source circuit voltage drop (${round(input.pvVoltageDropPercent)}%) exceeds the ${input.dcVoltageDropLimitPercent}% limit. Increase conductor size.`,
    });
  }

  if (input.acVoltageDropPercent > input.acVoltageDropLimitPercent) {
    warnings.push({
      code: 'IEC62548-DROP-AC',
      severity: 'warning',
      standard: 'IEC 62548',
      message: `AC circuit voltage drop (${round(input.acVoltageDropPercent)}%) exceeds the ${input.acVoltageDropLimitPercent}% limit. Increase conductor size.`,
    });
  }

  if (!input.ampacityPasses) {
    warnings.push({
      code: 'IEC62548-AMPACITY',
      severity: 'error',
      standard: 'IEC 62548',
      message:
        'Conductor ampacity is insufficient for the design current after temperature derating. Increase conductor size.',
    });
  }

  return warnings;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
