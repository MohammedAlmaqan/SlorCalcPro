import type { AuditTrail } from '../audit';
import type { InverterResult, InverterSpec, SystemType, SystemVoltage } from '../types';
import { round } from '../data/cableTable';

export const DEFAULT_INVERTER_SIZING_FACTOR = 1.25;

/**
 * Inverter type decision tree (study §3.4):
 *   1. Grid available? No → Off Grid
 *   2. Need power during outages? No → On Grid · Yes → Hybrid
 */
export function recommendInverterType(gridAvailable: boolean, needsBackup: boolean): SystemType {
  if (!gridAvailable) {
    return 'off-grid';
  }
  return needsBackup ? 'hybrid' : 'on-grid';
}

function nextStandardPower(watts: number): number {
  const standards = [300, 500, 800, 1000, 1500, 2000, 3000, 5000, 6000, 8000, 10000];
  const match = standards.find((s) => s >= watts);
  return match ?? Math.ceil(watts / 1000) * 1000;
}

export interface InverterSizingInput {
  peakSimultaneousWatts: number;
  peakSurgeWatts: number;
  recommendedType: SystemType;
  systemVoltageV: SystemVoltage;
  inverter: InverterSpec | null;
  sizingFactor?: number;
}

/**
 * Inverter sizing (study §2.4):
 *   Rated Power ≥ Sum of simultaneously-running loads
 *   Surge handling: motors draw 3–7× rated at startup.
 */
export function sizeInverter(input: InverterSizingInput, audit: AuditTrail): InverterResult {
  const factor = input.sizingFactor ?? DEFAULT_INVERTER_SIZING_FACTOR;
  const continuous = input.peakSimultaneousWatts * factor;
  const recommendedContinuousWatts = nextStandardPower(continuous);
  const recommendedSurgeWatts = Math.max(input.peakSurgeWatts, recommendedContinuousWatts * 2);

  audit.add({
    id: 'inverter.continuous',
    description: 'Recommended inverter continuous power',
    formula: 'peakSimultaneous × safetyFactor',
    values: { peakSimultaneousWatts: input.peakSimultaneousWatts, safetyFactor: factor },
    result: recommendedContinuousWatts,
    unit: 'W',
  });

  audit.add({
    id: 'inverter.surge',
    description: 'Recommended inverter surge power',
    formula: 'max(peakSurge, continuous × 2)',
    values: { peakSurgeWatts: input.peakSurgeWatts },
    result: recommendedSurgeWatts,
    unit: 'W',
  });

  const selected = input.inverter;
  const selectedContinuousWatts = selected?.continuousPowerW ?? null;
  const voltageMatch =
    selected == null ||
    selected.batteryVoltageV == null ||
    selected.batteryVoltageV === input.systemVoltageV;

  if (selected) {
    audit.add({
      id: 'inverter.selected',
      description: 'Selected inverter verification',
      formula: 'continuous ≥ recommended · batteryV = systemV',
      values: {
        selectedContinuous: selected.continuousPowerW,
        recommendedContinuous: recommendedContinuousWatts,
        selectedSurge: selected.surgePowerW,
        recommendedSurge: recommendedSurgeWatts,
        batteryVoltageMatch: String(voltageMatch),
      },
      result: voltageMatch ? 'OK' : 'MISMATCH',
    });
  }

  return {
    recommendedType: input.recommendedType,
    recommendedContinuousWatts,
    recommendedSurgeWatts,
    recommendedBatteryVoltageV: input.recommendedType === 'on-grid' ? null : input.systemVoltageV,
    selectedContinuousWatts,
    voltageMatch,
  };
}

/** Round-trip helper used by reports. */
export { round };
