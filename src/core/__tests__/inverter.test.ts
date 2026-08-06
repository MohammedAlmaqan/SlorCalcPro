import { AuditTrail } from '../audit';
import { recommendInverterType, sizeInverter } from '../formulas/inverter';
import { REFERENCE_HYBRID_INVERTER } from '../data/referenceComponents';

describe('recommendInverterType (study §3.4 decision tree)', () => {
  it('returns off-grid when no grid is available', () => {
    expect(recommendInverterType(false, true)).toBe('off-grid');
    expect(recommendInverterType(false, false)).toBe('off-grid');
  });
  it('returns on-grid when grid is available and no backup is needed', () => {
    expect(recommendInverterType(true, false)).toBe('on-grid');
  });
  it('returns hybrid when grid is available and backup is needed', () => {
    expect(recommendInverterType(true, true)).toBe('hybrid');
  });
});

describe('sizeInverter (study §2.4)', () => {
  const result = sizeInverter(
    {
      peakSimultaneousWatts: 800,
      peakSurgeWatts: 3400,
      recommendedType: 'hybrid',
      systemVoltageV: 12,
      inverter: null,
    },
    new AuditTrail(),
  );

  it('sizes continuous power with a 1.25 safety factor, rounded to standard', () => {
    expect(result.recommendedContinuousWatts).toBe(1000);
  });

  it('sizes surge power to cover motor startup', () => {
    expect(result.recommendedSurgeWatts).toBe(3400);
  });

  it('recommends a battery voltage for off-grid/hybrid', () => {
    expect(result.recommendedBatteryVoltageV).toBe(12);
  });

  it('flags voltage mismatch when a selected inverter does not match', () => {
    const mismatch = sizeInverter(
      {
        peakSimultaneousWatts: 800,
        peakSurgeWatts: 3400,
        recommendedType: 'hybrid',
        systemVoltageV: 12,
        inverter: REFERENCE_HYBRID_INVERTER, // 48 V battery input
      },
      new AuditTrail(),
    );
    expect(mismatch.voltageMatch).toBe(false);
  });
});
