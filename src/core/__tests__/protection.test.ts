import { AuditTrail } from '../audit';
import { sizeProtection, standardOcpd } from '../formulas/protection';

describe('standardOcpd', () => {
  it('rounds up to the next standard size', () => {
    expect(standardOcpd(21.84)).toBe(25);
    expect(standardOcpd(27.125)).toBe(30);
    expect(standardOcpd(12.5)).toBe(13);
  });
});

describe('sizeProtection (study §4)', () => {
  // Array Isc 14 A · inverter AC output 21.7 A · main 200 A · busbar 200 A
  const result = sizeProtection(
    {
      arrayIscA: 14,
      inverterAcOutputCurrentA: 21.7,
      mainBreakerA: 200,
      busbarRatingA: 200,
      systemType: 'hybrid',
      panelMaxSeriesFuseRating: 20,
    },
    new AuditTrail(),
  );

  it('sizes the PV source OCPD to Isc × 1.56 (NEC 690.8)', () => {
    expect(result.pvSourceOcpdA).toBeCloseTo(21.84, 2);
    expect(result.pvSourceOcpdStandardA).toBe(25);
  });

  it('sizes the AC breaker to inverter current × 1.25', () => {
    expect(result.acBreakerA).toBeCloseTo(27.125, 3);
    expect(result.acBreakerStandardA).toBe(30);
  });

  it('enforces the 120% backfeed rule (NEC 705.12)', () => {
    // 200 + 30 = 230 ≤ 240
    expect(result.backfeedPasses).toBe(true);
    expect(result.backfeedMarginPct).toBeCloseTo(4.1667, 1);
  });

  it('requires isolators/ATS per system type', () => {
    expect(result.dcIsolatorRequired).toBe(true);
    expect(result.acIsolatorRequired).toBe(true);
    expect(result.atsRequired).toBe(true);
  });
});
