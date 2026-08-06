import type { BatterySpec, ChargeControllerSpec, InverterSpec, PanelSpec } from '../types';

/**
 * Reference components used when the user has not yet selected hardware.
 * These are engineering-representative values — the Phase 2 curated catalog
 * will provide real manufacturer data.
 */

export const REFERENCE_PANEL: PanelSpec = {
  id: 'ref-panel',
  brand: 'Reference',
  model: 'MONO 550W',
  pmaxW: 550,
  vocV: 49.9,
  vmpV: 41.6,
  iscA: 14.0,
  impA: 13.2,
  tempCoeffPmax: -0.35,
  tempCoeffVoc: -0.29,
  maxSeriesFuseRating: 20,
  maxSystemVoltage: 1000,
  dimensionsMm: { width: 1134, height: 2279, depth: 30 },
  weightKg: 28.5,
};

export const REFERENCE_GRID_INVERTER: InverterSpec = {
  id: 'ref-inverter-grid',
  brand: 'Reference',
  model: 'STRING 6kW',
  supportedTypes: ['on-grid', 'hybrid'],
  continuousPowerW: 6000,
  surgePowerW: 6000,
  batteryVoltageV: null,
  maxPvVoltageV: 600,
  mpptVoltageRangeMinV: 120,
  mpptVoltageRangeMaxV: 550,
  maxPvCurrentA: 15,
  mpptCount: 2,
  maxAcOutputCurrentA: 26.1,
  efficiency: 0.98,
};

export const REFERENCE_HYBRID_INVERTER: InverterSpec = {
  id: 'ref-inverter-hybrid',
  brand: 'Reference',
  model: 'HYBRID 5kW',
  supportedTypes: ['hybrid', 'off-grid'],
  continuousPowerW: 5000,
  surgePowerW: 10000,
  batteryVoltageV: 48,
  maxPvVoltageV: 500,
  mpptVoltageRangeMinV: 120,
  mpptVoltageRangeMaxV: 450,
  maxPvCurrentA: 18,
  mpptCount: 2,
  maxAcOutputCurrentA: 21.7,
  efficiency: 0.97,
};

export const REFERENCE_BATTERY: BatterySpec = {
  id: 'ref-battery',
  brand: 'Reference',
  model: 'LiFePO4 48V 100Ah',
  chemistry: 'lifepo4',
  nominalVoltageV: 48,
  capacityAh: 100,
  maxChargeCurrentA: 50,
  maxDischargeCurrentA: 100,
  recommendedDoD: 0.8,
  cycles: 6000,
};

export const REFERENCE_CONTROLLER: ChargeControllerSpec = {
  id: 'ref-controller',
  brand: 'Reference',
  model: 'MPPT 60A',
  type: 'MPPT',
  ratedCurrentA: 60,
  maxPvVoltageV: 150,
  systemVoltageV: 48,
  efficiency: 0.94,
};

/** Per-system-type default inverter for engine recommendations. */
export function referenceInverterFor(type: string): InverterSpec {
  return type === 'on-grid' ? REFERENCE_GRID_INVERTER : REFERENCE_HYBRID_INVERTER;
}
