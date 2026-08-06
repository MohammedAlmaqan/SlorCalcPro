import { AuditTrail } from '../audit';
import { sizeChargeController } from '../formulas/chargeController';

describe('sizeChargeController (study §2.5)', () => {
  // 3S1P string of the reference 550W panel: Isc 14 A, Voc 149.7 V, array 1650 W
  const result = sizeChargeController(14, 149.7, 1650, null, new AuditTrail());

  it('rates the controller at Isc × 1.25', () => {
    expect(result.minCurrentA).toBeCloseTo(17.5, 1);
  });

  it('requires the max input voltage to exceed cold Voc × 1.25', () => {
    expect(result.maxPvVoltageRequiredV).toBeCloseTo(149.7 * 1.25, 1);
  });

  it('recommends MPPT for systems above 200 W', () => {
    expect(result.recommendedType).toBe('MPPT');
  });

  it('recommends PWM for small systems', () => {
    const small = sizeChargeController(5, 50, 150, null, new AuditTrail());
    expect(small.recommendedType).toBe('PWM');
  });
});
