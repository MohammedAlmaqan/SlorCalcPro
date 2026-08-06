import { AuditTrail } from '../audit';
import { requiredArrayWatts, recommendStringConfiguration } from '../formulas/pv';
import { recommendSystemVoltage } from '../formulas/systemVoltage';
import { REFERENCE_PANEL } from '../data/referenceComponents';

describe('requiredArrayWatts (study §2.2)', () => {
  it('sizes the array from daily energy ÷ winter PSH ÷ loss factor', () => {
    const audit = new AuditTrail();
    // 2611.11 Wh/day, winter PSH 4.0, loss factor 0.75
    const watts = requiredArrayWatts(2611.11, 4.0, 0.75, audit);
    expect(watts).toBeCloseTo(870.37, 1);
  });
});

describe('recommendSystemVoltage (study §3.3)', () => {
  it('recommends 12 V below 1 kW', () => expect(recommendSystemVoltage(800)).toBe(12));
  it('recommends 24 V between 1–3 kW', () => expect(recommendSystemVoltage(2000)).toBe(24));
  it('recommends 48 V above 3 kW', () => expect(recommendSystemVoltage(4000)).toBe(48));
});

describe('recommendStringConfiguration (study §3.2)', () => {
  const constraints = {
    maxVoltageV: 600,
    mpptMinVoltageV: 120,
    mpptMaxVoltageV: 550,
    maxCurrentA: 30,
  };

  it('builds a valid series/parallel string', () => {
    const config = recommendStringConfiguration(
      870.37,
      REFERENCE_PANEL,
      constraints,
      new AuditTrail(),
    );
    expect(config.seriesCount).toBe(3);
    expect(config.parallelCount).toBe(1);
    expect(config.totalPanelCount).toBe(3);
    expect(config.actualArrayWatts).toBe(3 * REFERENCE_PANEL.pmaxW);
    expect(config.arrayVocV).toBeCloseTo(3 * REFERENCE_PANEL.vocV, 2);
    expect(config.arrayIscA).toBeCloseTo(REFERENCE_PANEL.iscA, 2);
    expect(config.fitsInverterLimits).toBe(true);
  });

  it('respects the MPPT max voltage (series limit)', () => {
    const tight = { maxVoltageV: 150, mpptMinVoltageV: 60, mpptMaxVoltageV: 140, maxCurrentA: 30 };
    const config = recommendStringConfiguration(5000, REFERENCE_PANEL, tight, new AuditTrail());
    expect(config.seriesCount).toBeLessThanOrEqual(Math.floor(140 / REFERENCE_PANEL.vocV));
    expect(config.arrayVocV).toBeLessThanOrEqual(150);
  });
});
