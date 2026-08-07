import { draftToSpec, specToDraft } from '../CatalogEditor';
import type { AnySpec } from '@/db/repos/catalog';

describe('CatalogEditor spec conversion', () => {
  test('panel spec round-trips through draft', () => {
    const spec = {
      id: 'p1',
      brand: 'Test',
      model: 'M400',
      pmaxW: 400,
      vocV: 49.6,
      vmpV: 41.4,
      iscA: 13.2,
      impA: 12.6,
      tempCoeffPmax: -0.34,
      tempCoeffVoc: -0.28,
      maxSeriesFuseRating: 20,
      maxSystemVoltage: 1000,
    } satisfies AnySpec;

    const draft = specToDraft('panel', spec);
    const back = draftToSpec('panel', draft) as typeof spec;
    expect(back.pmaxW).toBe(400);
    expect(back.vocV).toBe(49.6);
    expect(back.maxSeriesFuseRating).toBe(20);
  });

  test('inverter supportedTypes splits and rejoins', () => {
    const spec = {
      id: 'i1',
      brand: 'Test',
      model: 'H5K',
      supportedTypes: ['on-grid', 'hybrid'],
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
    } satisfies AnySpec;

    const draft = specToDraft('inverter', spec);
    expect(draft.supportedTypes).toBe('on-grid,hybrid');
    expect(draft.batteryVoltageV).toBe('48');

    const back = draftToSpec('inverter', draft) as typeof spec;
    expect(back.supportedTypes).toEqual(['on-grid', 'hybrid']);
    expect(back.batteryVoltageV).toBe(48);
  });

  test('battery enum values map correctly', () => {
    const spec = {
      id: 'b1',
      brand: 'Test',
      model: 'LFP100',
      chemistry: 'lifepo4',
      nominalVoltageV: 12,
      capacityAh: 100,
      maxChargeCurrentA: 50,
      maxDischargeCurrentA: 100,
      recommendedDoD: 0.8,
      cycles: 6000,
    } satisfies AnySpec;

    const draft = specToDraft('battery', spec);
    expect(draft.chemistry).toBe('lifepo4');
    const back = draftToSpec('battery', draft) as typeof spec;
    expect(back.chemistry).toBe('lifepo4');
    expect(back.recommendedDoD).toBe(0.8);
  });
});
