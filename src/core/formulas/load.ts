import type { AuditTrail } from '../audit';
import type { DailyLoadResult, LoadItem } from '../types';

export const DEFAULT_INVERTER_EFFICIENCY = 0.9;
export const DEFAULT_MOTOR_SURGE_FACTOR = 5;

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
