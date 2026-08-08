import type { AuditTrail } from '../audit';
import type { DailyLoadResult, LoadItem } from '../types';

export const DEFAULT_INVERTER_EFFICIENCY = 0.9;
export const DEFAULT_MOTOR_SURGE_FACTOR = 5;
/** Hours used to estimate peak load when the user only provides daily kWh. */
export const TOTAL_LOAD_ESTIMATE_HOURS = 6;
/** Surge multiplier applied to the peak when the user omits a surge figure. */
export const TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER = 1.5;

/**
 * Daily energy audit (study §2.1):
 *   Daily Energy (Wh/day) = Σ (Appliance Power × Daily Usage hours)
 *   Actual DC Energy = AC Load Energy ÷ Inverter Efficiency
 */
export function calculateDailyLoad(
  loads: LoadItem[],
  inverterEfficiency: number,
  audit: AuditTrail,
): DailyLoadResult {
  let acWhPerDay = 0;
  let dcWhPerDay = 0;
  let peakSimultaneousWatts = 0;
  let peakSurgeWatts = 0;

  for (const load of loads) {
    const dailyWh = load.quantity * load.powerWatts * load.hoursPerDay;
    if (load.isAc) {
      acWhPerDay += dailyWh;
    } else {
      dcWhPerDay += dailyWh;
    }

    if (load.isSimultaneous) {
      const simultaneousW = load.quantity * load.powerWatts;
      peakSimultaneousWatts += simultaneousW;
      const factor = load.isInductive ? (load.surgeFactor ?? DEFAULT_MOTOR_SURGE_FACTOR) : 1;
      peakSurgeWatts += simultaneousW * factor;
    }
  }

  const totalWhPerDay = acWhPerDay + dcWhPerDay;
  const dcEquivalentWhPerDay = acWhPerDay / inverterEfficiency + dcWhPerDay;

  audit.add({
    id: 'load.energy',
    description: 'Daily energy consumption',
    formula: 'Σ (P × qty × h)',
    values: {
      acWhPerDay: round2(acWhPerDay),
      dcWhPerDay: round2(dcWhPerDay),
    },
    result: round2(totalWhPerDay),
    unit: 'Wh/day',
  });

  audit.add({
    id: 'load.dcEquivalent',
    description: 'DC-equivalent energy at inverter input',
    formula: 'AC_Wh ÷ inverterEfficiency + DC_Wh',
    values: { acWhPerDay: round2(acWhPerDay), inverterEfficiency, dcWhPerDay: round2(dcWhPerDay) },
    result: round2(dcEquivalentWhPerDay),
    unit: 'Wh/day',
  });

  audit.add({
    id: 'load.peak',
    description: 'Peak simultaneous load',
    formula: 'Σ (P × qty) for simultaneous loads',
    values: {},
    result: peakSimultaneousWatts,
    unit: 'W',
  });

  audit.add({
    id: 'load.surge',
    description: 'Peak surge load (motor startup)',
    formula: 'Σ simultaneous loads × surgeFactor',
    values: { surgeFactor: DEFAULT_MOTOR_SURGE_FACTOR },
    result: peakSurgeWatts,
    unit: 'W',
  });

  return {
    totalWhPerDay,
    acWhPerDay,
    dcWhPerDay,
    dcEquivalentWhPerDay,
    peakSimultaneousWatts,
    peakSurgeWatts,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Daily load audit for the 'total' load mode, where the user provides the
 * whole-house daily energy instead of an appliance list. Peak and surge loads
 * are taken from the optional inputs or estimated when omitted.
 */
export function calculateTotalDailyLoad(
  input: {
    totalDailyKwh: number;
    peakKw?: number;
    surgeKw?: number;
    isAc: boolean;
    inverterEfficiency: number;
  },
  audit: AuditTrail,
): DailyLoadResult {
  const totalWhPerDay = Math.max(0, input.totalDailyKwh) * 1000;
  const acWhPerDay = input.isAc ? totalWhPerDay : 0;
  const dcWhPerDay = input.isAc ? 0 : totalWhPerDay;
  const dcEquivalentWhPerDay = input.isAc
    ? totalWhPerDay / input.inverterEfficiency
    : totalWhPerDay;

  const peakSimultaneousWatts =
    (input.peakKw !== undefined && input.peakKw > 0
      ? input.peakKw
      : totalWhPerDay / 1000 / TOTAL_LOAD_ESTIMATE_HOURS) * 1000;
  const peakSurgeWatts =
    (input.surgeKw !== undefined && input.surgeKw > 0
      ? input.surgeKw
      : (peakSimultaneousWatts / 1000) * TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER) * 1000;

  audit.add({
    id: 'load.energy',
    description: 'Daily energy consumption (total entered by user)',
    formula: 'entered daily kWh',
    values: { totalKwhPerDay: round2(totalWhPerDay / 1000), isAc: input.isAc ? 'AC' : 'DC' },
    result: round2(totalWhPerDay),
    unit: 'Wh/day',
  });

  audit.add({
    id: 'load.dcEquivalent',
    description: 'DC-equivalent energy at inverter input',
    formula: input.isAc ? 'AC_Wh ÷ inverterEfficiency' : 'DC_Wh',
    values: { acWhPerDay: round2(acWhPerDay), inverterEfficiency: input.inverterEfficiency },
    result: round2(dcEquivalentWhPerDay),
    unit: 'Wh/day',
  });

  audit.add({
    id: 'load.peak',
    description: 'Peak simultaneous load',
    formula:
      input.peakKw !== undefined
        ? 'entered peak kW'
        : `estimated as daily kWh ÷ ${TOTAL_LOAD_ESTIMATE_HOURS} h`,
    values: { peakKw: round2(peakSimultaneousWatts / 1000) },
    result: round2(peakSimultaneousWatts),
    unit: 'W',
  });

  audit.add({
    id: 'load.surge',
    description: 'Peak surge load (motor startup)',
    formula:
      input.surgeKw !== undefined
        ? 'entered surge kW'
        : `estimated as peak × ${TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER}`,
    values: { surgeKw: round2(peakSurgeWatts / 1000) },
    result: round2(peakSurgeWatts),
    unit: 'W',
  });

  return {
    totalWhPerDay,
    acWhPerDay,
    dcWhPerDay,
    dcEquivalentWhPerDay,
    peakSimultaneousWatts,
    peakSurgeWatts,
  };
}
