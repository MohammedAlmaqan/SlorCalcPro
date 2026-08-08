import type { AuditTrail } from '../audit';
import type { CableResult, CableSelection } from '../types';
import { CABLE_TABLE, conductorArea, selectCable, voltageDropPercent } from '../data/cableTable';

export const DEFAULT_DC_VOLTAGE_DROP_PCT = 2;
export const DEFAULT_AC_VOLTAGE_DROP_PCT = 3;
export const DEFAULT_TEMP_DERATING_FACTOR = 0.6;
export const DEFAULT_AC_VOLTAGE = 230;
export const COPPER_RESISTIVITY = 0.0172;

export interface CircuitParams {
  currentA: number;
  circuitVoltageV: number;
  lengthM: number;
  allowedDropPercent: number;
  tempDeratingFactor: number;
  label: string;
}

function sizeCircuit(params: CircuitParams, audit: AuditTrail): CableSelection {
  const allowedDropV = (params.allowedDropPercent / 100) * params.circuitVoltageV;
  const requiredArea = conductorArea({
    lengthM: params.lengthM,
    currentA: params.currentA,
    resistivityOhmMm2PerM: COPPER_RESISTIVITY,
    allowedDropV,
  });

  // Ampacity must cover the design current with a 1.25 margin, derated for
  // rooftop ambient temperature (study §4.6). The conductor must satisfy BOTH
  // the voltage-drop area and the ampacity requirement, so step up to the next
  // larger standard size when the area-based selection is ampacity-limited.
  const designAmpacity = (params.currentA * 1.25) / params.tempDeratingFactor;
  const byArea = selectCable(requiredArea);
  const cable =
    byArea.ampacityA >= designAmpacity
      ? byArea
      : (CABLE_TABLE.find(
          (c) => c.crossSectionMm2 >= requiredArea && c.ampacityA >= designAmpacity,
        ) ?? byArea);

  const drop = voltageDropPercent({
    lengthM: params.lengthM,
    currentA: params.currentA,
    resistancePerKm: cable.resistancePerKm,
    circuitVoltageV: params.circuitVoltageV,
  });

  const ampacityPasses = cable.ampacityA >= designAmpacity;

  audit.add({
    id: `cable.${params.label}`,
    description: `Conductor sizing — ${params.label} circuit`,
    formula: 'A = (2 × L × I × ρ) ÷ ΔV',
    values: {
      currentA: round2(params.currentA),
      circuitVoltageV: round2(params.circuitVoltageV),
      lengthM: params.lengthM,
      allowedDropPercent: params.allowedDropPercent,
      requiredAreaMm2: round2(requiredArea),
      selectedMm2: cable.crossSectionMm2,
      designAmpacityA: round2(designAmpacity),
      cableAmpacityA: cable.ampacityA,
    },
    result: `${cable.crossSectionMm2} mm² (${cable.awg ?? 'n/a'}), ΔV ${round2(drop)}%`,
  });

  return {
    crossSectionMm2: cable.crossSectionMm2,
    awg: cable.awg,
    currentA: params.currentA,
    voltageDropPercent: drop,
    ampacityA: cable.ampacityA,
    ampacityPasses,
  };
}

export interface CableSizingInput {
  pvSourceCurrentA: number;
  pvArrayVmpV: number;
  dcOutputCurrentA: number;
  systemVoltageV: number;
  acOutputCurrentA: number;
  pvCableLengthM?: number;
  dcCableLengthM?: number;
  acCableLengthM?: number;
  dcVoltageDropPercent?: number;
  acVoltageDropPercent?: number;
  tempDeratingFactor?: number;
}

/**
 * Cable sizing for the three main circuits (study §4.6).
 * PV source circuit current uses NEC 690.8 factor Isc × 1.56.
 */
export function sizeCables(input: CableSizingInput, audit: AuditTrail): CableResult {
  const dcDrop = input.dcVoltageDropPercent ?? DEFAULT_DC_VOLTAGE_DROP_PCT;
  const acDrop = input.acVoltageDropPercent ?? DEFAULT_AC_VOLTAGE_DROP_PCT;
  const derating = input.tempDeratingFactor ?? DEFAULT_TEMP_DERATING_FACTOR;

  const pvSource = sizeCircuit(
    {
      currentA: input.pvSourceCurrentA,
      circuitVoltageV: input.pvArrayVmpV,
      lengthM: input.pvCableLengthM ?? 10,
      allowedDropPercent: dcDrop,
      tempDeratingFactor: derating,
      label: 'pvSource',
    },
    audit,
  );

  const dcOutput = sizeCircuit(
    {
      currentA: input.dcOutputCurrentA,
      circuitVoltageV: input.systemVoltageV,
      lengthM: input.dcCableLengthM ?? 2,
      allowedDropPercent: dcDrop,
      tempDeratingFactor: 1,
      label: 'dcOutput',
    },
    audit,
  );

  const acOutput = sizeCircuit(
    {
      currentA: input.acOutputCurrentA,
      circuitVoltageV: DEFAULT_AC_VOLTAGE,
      lengthM: input.acCableLengthM ?? 10,
      allowedDropPercent: acDrop,
      tempDeratingFactor: 1,
      label: 'acOutput',
    },
    audit,
  );

  return { pvSource, dcOutput, acOutput };
}

/** NEC 690.8 PV source circuit conductor current: Isc × 1.56. */
export function pvSourceCircuitCurrent(arrayIscA: number): number {
  return arrayIscA * 1.56;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Exported for report formatting / validation. */
export const CABLE_REFERENCE = CABLE_TABLE;
