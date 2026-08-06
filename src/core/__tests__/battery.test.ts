import { AuditTrail } from '../audit';
import { calculateBatteryBank } from '../formulas/battery';
import type { BatterySpec } from '../types';

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

describe('calculateBatteryBank (study §2.3)', () => {
  // dcEquivalent = 2611.11 Wh/day, autonomy 2 days, LiFePO4 DoD 0.8, 12 V system
  const result = calculateBatteryBank(
    {
      dcEquivalentWhPerDay: 2611.11,
      autonomyDays: 2,
      chemistry: 'lifepo4',
      systemVoltageV: 12,
      battery: LIFEPO4_12V_200AH,
    },
    new AuditTrail(),
  );

  it('computes required kWh', () => {
    expect(result.requiredKwh).toBeCloseTo((2611.11 * 2) / 800, 2);
  });

  it('computes required Ah at system voltage', () => {
    expect(result.requiredAhAtSystemVoltage).toBeCloseTo((2611.11 * 2) / (12 * 0.8), 1);
  });

  it('builds a series/parallel bank', () => {
    expect(result.seriesCount).toBe(1);
    expect(result.parallelCount).toBe(3);
    expect(result.batteryCount).toBe(3);
    expect(result.actualCapacityAh).toBe(600);
    expect(result.actualCapacityKwh).toBeCloseTo((600 * 12) / 1000, 2);
  });

  it('uses the recommended DoD of the selected battery', () => {
    expect(result.depthOfDischarge).toBe(0.8);
  });
});
