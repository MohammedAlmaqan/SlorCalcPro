import type { CableSpec } from '../types';

/**
 * Standard conductor reference table (copper, 75°C insulation).
 * Ampacity values approximate NEC Table 310.16 / IEC 60364 sizing.
 * Cross-sections follow the R10 metric series with AWG equivalents.
 */
export const CABLE_TABLE: CableSpec[] = [
  { id: 'c1.5', crossSectionMm2: 1.5, awg: '16 AWG', ampacityA: 15, resistancePerKm: 12.1 },
  { id: 'c2.5', crossSectionMm2: 2.5, awg: '14 AWG', ampacityA: 20, resistancePerKm: 7.41 },
  { id: 'c4', crossSectionMm2: 4, awg: '12 AWG', ampacityA: 30, resistancePerKm: 4.61 },
  { id: 'c6', crossSectionMm2: 6, awg: '10 AWG', ampacityA: 40, resistancePerKm: 3.08 },
  { id: 'c10', crossSectionMm2: 10, awg: '8 AWG', ampacityA: 55, resistancePerKm: 1.83 },
  { id: 'c16', crossSectionMm2: 16, awg: '6 AWG', ampacityA: 75, resistancePerKm: 1.15 },
  { id: 'c25', crossSectionMm2: 25, awg: '4 AWG', ampacityA: 100, resistancePerKm: 0.727 },
  { id: 'c35', crossSectionMm2: 35, awg: '2 AWG', ampacityA: 125, resistancePerKm: 0.524 },
  { id: 'c50', crossSectionMm2: 50, awg: '1/0 AWG', ampacityA: 150, resistancePerKm: 0.387 },
  { id: 'c70', crossSectionMm2: 70, awg: '2/0 AWG', ampacityA: 195, resistancePerKm: 0.268 },
  { id: 'c95', crossSectionMm2: 95, awg: '3/0 AWG', ampacityA: 230, resistancePerKm: 0.193 },
  { id: 'c120', crossSectionMm2: 120, awg: '4/0 AWG', ampacityA: 270, resistancePerKm: 0.153 },
];

/**
 * Returns the smallest standard cable whose cross-section is >= the required
 * area. Throws if the requirement exceeds the largest standard size.
 */
export function selectCable(minCrossSectionMm2: number): CableSpec {
  const match = CABLE_TABLE.find((cable) => cable.crossSectionMm2 >= minCrossSectionMm2);
  if (!match) {
    throw new Error(
      `Required conductor cross-section (${minCrossSectionMm2.toFixed(1)} mm²) exceeds the largest standard size.`,
    );
  }
  return match;
}

/**
 * Voltage-drop conductor sizing (study §4.6):
 *   A = (2 × L × I × ρ) / ΔV
 * where ρ is copper resistivity (Ω·mm²/m) and ΔV is the allowed drop in volts.
 */
export function conductorArea({
  lengthM,
  currentA,
  resistivityOhmMm2PerM = 0.0172,
  allowedDropV,
}: {
  lengthM: number;
  currentA: number;
  resistivityOhmMm2PerM?: number;
  allowedDropV: number;
}): number {
  if (allowedDropV <= 0) {
    throw new Error('Allowed voltage drop must be greater than 0 V.');
  }
  return (2 * lengthM * currentA * resistivityOhmMm2PerM) / allowedDropV;
}

/** Actual voltage drop percentage for a chosen conductor. */
export function voltageDropPercent({
  lengthM,
  currentA,
  resistancePerKm,
  circuitVoltageV,
}: {
  lengthM: number;
  currentA: number;
  resistancePerKm: number;
  circuitVoltageV: number;
}): number {
  if (circuitVoltageV <= 0) {
    throw new Error('Circuit voltage must be greater than 0 V.');
  }
  // R (Ω) = resistancePerKm × length(km) × 2 (two-way run)
  const dropV = 2 * lengthM * (resistancePerKm / 1000) * currentA;
  return (dropV / circuitVoltageV) * 100;
}

/** Rounds a value to a fixed number of decimals (0.1 default). */
export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
