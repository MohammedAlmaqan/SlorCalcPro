import type { Warning } from '../types';

/**
 * NEC 690 (PV systems), NEC 705 (interconnected), NEC 706 (energy storage).
 * Returns compliance warnings; empty array means compliant.
 */
export function necChecks(input: {
  arrayVocColdV: number;
  maxPvInputVoltageV: number;
  arrayIscA: number;
  maxControllerInputCurrentA: number;
  pvOcpdStandardA: number;
  panelMaxSeriesFuseRatingA: number;
  inverterContinuousW: number;
  requiredInverterContinuousW: number;
  mainBreakerA: number;
  pvBreakerA: number;
  busbarRatingA: number;
}): Warning[] {
  const warnings: Warning[] = [];

  if (input.arrayVocColdV > input.maxPvInputVoltageV) {
    warnings.push({
      code: 'NEC690-7-VOC',
      severity: 'error',
      standard: 'NEC 690.7',
      message: `Array cold Voc (${round(input.arrayVocColdV)} V) exceeds inverter max input voltage (${input.maxPvInputVoltageV} V). Reduce series count.`,
    });
  }

  if (input.arrayIscA > input.maxControllerInputCurrentA) {
    warnings.push({
      code: 'NEC690-8-ISC',
      severity: 'error',
      standard: 'NEC 690.8',
      message: `Array Isc (${round(input.arrayIscA)} A) exceeds controller max input current (${input.maxControllerInputCurrentA} A). Increase parallel strings are not allowed; reduce parallel count.`,
    });
  }

  if (input.pvOcpdStandardA > input.panelMaxSeriesFuseRatingA) {
    warnings.push({
      code: 'NEC690-9-FUSE',
      severity: 'error',
      standard: 'NEC 690.9',
      message: `PV source OCPD (${input.pvOcpdStandardA} A) exceeds the panel maximum series fuse rating (${input.panelMaxSeriesFuseRatingA} A).`,
    });
  }

  if (input.inverterContinuousW < input.requiredInverterContinuousW) {
    warnings.push({
      code: 'NEC705-14-INV',
      severity: 'error',
      standard: 'NEC 705.14',
      message: `Selected inverter continuous power (${input.inverterContinuousW} W) is below the required ${input.requiredInverterContinuousW} W.`,
    });
  }

  const available = input.busbarRatingA * 1.2;
  if (input.mainBreakerA + input.pvBreakerA > available) {
    warnings.push({
      code: 'NEC705-12-BACKFEED',
      severity: 'warning',
      standard: 'NEC 705.12(B)',
      message: `Main (${input.mainBreakerA} A) + PV breaker (${input.pvBreakerA} A) exceeds 120% of the ${input.busbarRatingA} A busbar (${round(available)} A).`,
    });
  }

  return warnings;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
