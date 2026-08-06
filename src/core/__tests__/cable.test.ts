import { AuditTrail } from '../audit';
import { conductorArea, selectCable, voltageDropPercent, CABLE_TABLE } from '../data/cableTable';
import { pvSourceCircuitCurrent, sizeCables } from '../formulas/cable';

describe('conductorArea (study §4.6: A = 2·L·I·ρ / ΔV)', () => {
  it('sizes a PV source conductor', () => {
    const area = conductorArea({ lengthM: 10, currentA: 21.84, allowedDropV: 2.496 });
    expect(area).toBeCloseTo(3.0097, 2);
  });

  it('sizes a high-current DC run', () => {
    const area = conductorArea({ lengthM: 2, currentA: 92.59, allowedDropV: 0.24 });
    expect(area).toBeCloseTo(26.54, 1);
  });
});

describe('selectCable', () => {
  it('picks the next standard size up', () => {
    expect(selectCable(3.01).crossSectionMm2).toBe(4);
    expect(selectCable(26.54).crossSectionMm2).toBe(35);
    expect(selectCable(1.0).crossSectionMm2).toBe(1.5);
  });

  it('throws when requirement exceeds the table', () => {
    expect(() => selectCable(500)).toThrow();
  });

  it('exposes the AWG ↔ mm² reference table', () => {
    expect(CABLE_TABLE.length).toBeGreaterThanOrEqual(10);
  });
});

describe('voltageDropPercent', () => {
  it('computes a two-way voltage drop', () => {
    // 4 mm², R = 4.61 Ω/km, 10 m, 21.84 A, 124.8 V circuit
    const drop = voltageDropPercent({
      lengthM: 10,
      currentA: 21.84,
      resistancePerKm: 4.61,
      circuitVoltageV: 124.8,
    });
    expect(drop).toBeCloseTo(1.6135, 2);
  });
});

describe('sizeCables', () => {
  // 3S1P reference panel array (Isc 14 A), 12 V hybrid system, 1000 W continuous inverter
  const result = sizeCables(
    {
      pvSourceCurrentA: pvSourceCircuitCurrent(14),
      pvArrayVmpV: 3 * 41.6,
      dcOutputCurrentA: 1000 / (12 * 0.9),
      systemVoltageV: 12,
      acOutputCurrentA: 21.7,
    },
    new AuditTrail(),
  );

  it('sizes the PV source circuit to NEC 690.8 (Isc × 1.56)', () => {
    expect(result.pvSource.currentA).toBeCloseTo(21.84, 2);
    expect(result.pvSource.crossSectionMm2).toBe(4);
    expect(result.pvSource.voltageDropPercent).toBeCloseTo(1.61, 1);
  });

  it('sizes the DC output run for battery↔inverter current', () => {
    expect(result.dcOutput.crossSectionMm2).toBe(35);
    expect(result.dcOutput.voltageDropPercent).toBeCloseTo(1.62, 1);
  });

  it('sizes the AC output circuit', () => {
    expect(result.acOutput.currentA).toBeCloseTo(21.7, 2);
    expect(result.acOutput.voltageDropPercent).toBeLessThanOrEqual(3);
  });
});
