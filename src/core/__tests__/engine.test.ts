import { designSystem } from '../engine';
import type { BatterySpec, SystemInput } from '../types';
import { WORKED_LOADS } from './load.test';

const LIFEPO4_12V_200AH: BatterySpec = {
  id: 'b1',
  brand: 'Test',
  model: 'LiFePO4 12V 200Ah',
  chemistry: 'lifepo4',
  nominalVoltageV: 12,
  capacityAh: 200,
  maxChargeCurrentA: 100,
  maxDischargeCurrentA: 200,
  recommendedDoD: 0.8,
  cycles: 6000,
};

const FLOODED_12V_200AH: BatterySpec = {
  id: 'b2',
  brand: 'Test',
  model: 'Flooded 12V 200Ah',
  chemistry: 'flooded',
  nominalVoltageV: 12,
  capacityAh: 200,
  maxChargeCurrentA: 50,
  maxDischargeCurrentA: 300,
  recommendedDoD: 0.5,
  cycles: 1200,
};

function hybridInput(): SystemInput {
  return {
    loads: WORKED_LOADS,
    systemType: 'hybrid',
    winterPsh: 4.0,
    summerPsh: 6.0,
    autonomyDays: 2,
    chemistry: 'lifepo4',
    systemVoltageOverride: 48,
    selected: { battery: LIFEPO4_12V_200AH },
  };
}

describe('designSystem — end-to-end hybrid design', () => {
  const result = designSystem(hybridInput());

  it('records a full audit trail', () => {
    expect(result.audit.length).toBeGreaterThan(10);
    expect(result.audit[0]).toHaveProperty('formula');
  });

  it('produces a load audit consistent with study §2.1', () => {
    expect(result.dailyLoad.totalWhPerDay).toBeCloseTo(2350, 1);
    expect(result.dailyLoad.dcEquivalentWhPerDay).toBeCloseTo(2350 / 0.9, 1);
  });

  it('sizes the PV array (study §2.2)', () => {
    expect(result.pv.requiredArrayWatts).toBeCloseTo(870.37, 1);
    expect(result.pv.seriesCount).toBe(3);
    expect(result.pv.parallelCount).toBe(1);
    expect(result.pv.actualArrayWatts).toBe(1650);
  });

  it('sizes the battery bank (study §2.3)', () => {
    expect(result.battery.systemVoltageV).toBe(48);
    expect(result.battery.seriesCount).toBe(4);
    expect(result.battery.parallelCount).toBe(1);
    expect(result.battery.batteryCount).toBe(4);
    expect(result.battery.actualCapacityKwh).toBeCloseTo(9.6, 1);
  });

  it('sizes the inverter (study §2.4)', () => {
    expect(result.inverter.recommendedContinuousWatts).toBe(1000);
    expect(result.inverter.recommendedSurgeWatts).toBe(3400);
    expect(result.inverter.recommendedType).toBe('hybrid');
    expect(result.inverter.voltageMatch).toBe(true);
  });

  it('sizes the charge controller (study §2.5)', () => {
    expect(result.controller.recommendedType).toBe('MPPT');
    expect(result.controller.minCurrentA).toBeCloseTo(17.5, 1);
  });

  it('sizes protection devices (study §4)', () => {
    expect(result.protection.pvSourceOcpdStandardA).toBe(25);
    expect(result.protection.acBreakerStandardA).toBe(30);
    expect(result.protection.backfeedPasses).toBe(true);
  });

  it('runs compliance checks', () => {
    expect(result.compliance.arrayVocColdV).toBeGreaterThan(result.pv.arrayVocV);
    expect(result.compliance.arrayVocWithinInverterLimit).toBe(true);
  });

  it('sizes the PV source cable to meet ampacity', () => {
    const codes = result.warnings.map((w) => w.code);
    expect(codes).not.toContain('CABLE-AMPACITY-PV');
    expect(result.cables.pvSource.ampacityPasses).toBe(true);
  });
});

describe('designSystem — on-grid design', () => {
  const result = designSystem({
    loads: WORKED_LOADS,
    systemType: 'on-grid',
    winterPsh: 4.0,
    summerPsh: 6.0,
    autonomyDays: 0,
    chemistry: 'lifepo4',
  });

  it('does not require a battery bank', () => {
    expect(result.battery.batteryCount).toBe(0);
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain('BATTERY-NOT-REQUIRED');
  });

  it('sizes the array against the grid-tie inverter MPPT', () => {
    expect(result.pv.actualArrayWatts).toBeGreaterThanOrEqual(result.pv.requiredArrayWatts);
  });
});

describe('designSystem — off-grid design', () => {
  const result = designSystem({
    loads: WORKED_LOADS,
    systemType: 'off-grid',
    winterPsh: 4.0,
    summerPsh: 6.0,
    autonomyDays: 3,
    chemistry: 'flooded',
    systemVoltageOverride: 48,
    selected: { battery: FLOODED_12V_200AH },
  });

  it('sizes the battery with flooded DoD (0.5)', () => {
    expect(result.battery.depthOfDischarge).toBe(0.5);
    expect(result.battery.requiredAhAtSystemVoltage).toBeCloseTo((2611.11 * 3) / (48 * 0.5), 1);
  });

  it('uses the charge controller MPPT constraints for the array', () => {
    // Off-grid strings limited by controller max PV voltage (150 V ref controller)
    expect(result.pv.arrayVocV).toBeLessThanOrEqual(150);
  });
});

describe('designSystem — standards policy', () => {
  const nonCompliant = (): SystemInput => ({
    loads: [{ id: 'l1', name: 'Fridge', quantity: 1, powerWatts: 150, hoursPerDay: 24, isAc: true, isSimultaneous: true, isInductive: true, surgeFactor: 3 }],
    systemType: 'off-grid',
    winterPsh: 4.0,
    summerPsh: 6.0,
    autonomyDays: 2,
    chemistry: 'lifepo4',
    systemVoltageOverride: 48,
  });

  it('keeps standards errors in strict mode', () => {
    const result = designSystem(nonCompliant());
    const voc = result.warnings.find((w) => w.code === 'NEC690-7-VOC');
    expect(voc).toBeDefined();
    expect(voc?.severity).toBe('error');
  });

  it('downgrades standards errors to warnings in advisory mode', () => {
    const result = designSystem({ ...nonCompliant(), standardsPolicy: 'advisory' });
    const voc = result.warnings.find((w) => w.code === 'NEC690-7-VOC');
    expect(voc?.severity).toBe('warning');
    expect(result.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
  });

  it('hides standards checks in off mode', () => {
    const result = designSystem({ ...nonCompliant(), standardsPolicy: 'off' });
    expect(result.warnings.some((w) => w.code.startsWith('NEC'))).toBe(false);
  });
});
