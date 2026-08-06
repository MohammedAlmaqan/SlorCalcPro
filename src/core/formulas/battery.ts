import type { AuditTrail } from '../audit';
import type { BatteryChemistry, BatteryResult, BatterySpec, SystemVoltage } from '../types';
import { round } from '../data/cableTable';

/** Recommended depth of discharge by chemistry (study §2.3). */
export const DOD_BY_CHEMISTRY: Record<BatteryChemistry, number> = {
  lifepo4: 0.8,
  flooded: 0.5,
  'agm-gel': 0.6,
};

export interface BatteryInputs {
  dcEquivalentWhPerDay: number;
  autonomyDays: number;
  chemistry: BatteryChemistry;
  systemVoltageV: SystemVoltage;
  battery: BatterySpec;
}

/**
 * Battery bank sizing (study §2.3):
 *   kWh = Daily Energy × Autonomy ÷ DoD
 *   Ah  = (Wh × Autonomy) ÷ (V × DoD)
 */
export function calculateBatteryBank(inputs: BatteryInputs, audit: AuditTrail): BatteryResult {
  const dod =
    inputs.battery.recommendedDoD > 0
      ? inputs.battery.recommendedDoD
      : DOD_BY_CHEMISTRY[inputs.chemistry];

  const requiredKwh = (inputs.dcEquivalentWhPerDay * inputs.autonomyDays) / (dod * 1000);
  const requiredAh =
    (inputs.dcEquivalentWhPerDay * inputs.autonomyDays) / (inputs.systemVoltageV * dod);

  const seriesCount = Math.ceil(inputs.systemVoltageV / inputs.battery.nominalVoltageV);
  const parallelCount = Math.ceil(requiredAh / inputs.battery.capacityAh);
  const batteryCount = seriesCount * parallelCount;
  const actualCapacityAh = parallelCount * inputs.battery.capacityAh;
  const actualCapacityKwh = (actualCapacityAh * inputs.systemVoltageV) / 1000;

  audit.add({
    id: 'battery.kwh',
    description: 'Required battery energy capacity',
    formula: 'Daily_kWh × autonomy ÷ DoD',
    values: {
      dailyKwh: round(inputs.dcEquivalentWhPerDay / 1000),
      autonomyDays: inputs.autonomyDays,
      dod,
    },
    result: round(requiredKwh),
    unit: 'kWh',
  });

  audit.add({
    id: 'battery.ah',
    description: 'Required battery capacity at system voltage',
    formula: '(Wh × autonomy) ÷ (V × DoD)',
    values: {
      wh: round(inputs.dcEquivalentWhPerDay),
      autonomyDays: inputs.autonomyDays,
      systemVoltageV: inputs.systemVoltageV,
      dod,
    },
    result: round(requiredAh),
    unit: 'Ah',
  });

  audit.add({
    id: 'battery.bank',
    description: 'Battery bank configuration',
    formula: 'N_series = systemV ÷ batteryV · N_parallel = requiredAh ÷ capacityAh',
    values: {
      batteryVoltageV: inputs.battery.nominalVoltageV,
      batteryCapacityAh: inputs.battery.capacityAh,
      seriesCount,
      parallelCount,
    },
    result: `${seriesCount}S${parallelCount}P = ${batteryCount} batteries`,
  });

  return {
    systemVoltageV: inputs.systemVoltageV,
    requiredKwh,
    requiredAhAtSystemVoltage: requiredAh,
    seriesCount,
    parallelCount,
    batteryCount,
    actualCapacityAh,
    actualCapacityKwh,
    depthOfDischarge: dod,
  };
}
