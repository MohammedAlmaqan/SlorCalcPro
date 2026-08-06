import type { SystemVoltage } from '../types';

/**
 * System voltage recommendation (study §3.3).
 *   < 1 kW → 12 V · 1–3 kW → 24 V · > 3 kW → 48 V
 */
export function recommendSystemVoltage(totalPowerWatts: number): SystemVoltage {
  if (totalPowerWatts < 1000) {
    return 12;
  }
  if (totalPowerWatts <= 3000) {
    return 24;
  }
  return 48;
}

export const SYSTEM_VOLTAGES: SystemVoltage[] = [12, 24, 48];
