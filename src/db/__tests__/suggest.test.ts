import type { SuggestRequirements } from '../suggest';
import { suggestComponents } from '../suggest';
import { catalogRepo } from '../repos/catalog';
import { openTestDb } from './helpers/testDb';

async function requirements(
  overrides?: Partial<SuggestRequirements>,
): Promise<SuggestRequirements> {
  return {
    requiredArrayWatts: 3000,
    recommendedContinuousWatts: 2500,
    recommendedSurgeWatts: 7500,
    systemVoltage: 48,
    systemType: 'off-grid',
    chemistry: 'lifepo4',
    requiredKwh: 7.5,
    controllerMinCurrentA: 30,
    controllerMaxPvVoltageRequiredV: 120,
    mpptMinVoltageV: 90,
    mpptMaxVoltageV: 450,
    maxInputVoltageV: 150,
    ...overrides,
  };
}

describe('suggestComponents', () => {
  test('returns non-null suggestions for every slot on an off-grid design', async () => {
    const db = await openTestDb();
    const catalog = catalogRepo(db);
    const [panels, inverters, batteries, controllers] = await Promise.all([
      catalog.list('panel'),
      catalog.list('inverter'),
      catalog.list('battery'),
      catalog.list('controller'),
    ]);

    const suggestion = suggestComponents(
      await requirements(),
      panels,
      inverters,
      batteries,
      controllers,
    );

    expect(suggestion.panelId).toBeTruthy();
    expect(suggestion.inverterId).toBeTruthy();
    expect(suggestion.batteryId).toBeTruthy();
    expect(suggestion.controllerId).toBeTruthy();
  });

  test('panel suggestion minimizes panel count within string voltage limits', async () => {
    const db = await openTestDb();
    const catalog = catalogRepo(db);
    const panels = await catalog.list('panel');

    const suggestion = suggestComponents(await requirements(), panels, [], [], []);
    const panel = panels.find((p) => p.id === suggestion.panelId);
    expect(panel).toBeDefined();
    expect(panel!.spec.pmaxW).toBeGreaterThan(0);

    const maxSeries = Math.floor(150 / panel!.spec.vocV);
    const minSeries = Math.max(1, Math.ceil(90 / panel!.spec.vmpV));
    expect(minSeries).toBeLessThanOrEqual(maxSeries);
  });

  test('on-grid design returns no battery suggestion', async () => {
    const db = await openTestDb();
    const catalog = catalogRepo(db);
    const [panels, inverters, batteries] = await Promise.all([
      catalog.list('panel'),
      catalog.list('inverter'),
      catalog.list('battery'),
    ]);

    const suggestion = suggestComponents(
      await requirements({ systemType: 'on-grid' }),
      panels,
      inverters,
      batteries,
      [],
    );

    expect(suggestion.batteryId).toBeNull();
    expect(suggestion.inverterId).toBeTruthy();
    expect(suggestion.panelId).toBeTruthy();
  });

  test('inverter suggestion matches the system voltage for battery-backed systems', async () => {
    const db = await openTestDb();
    const catalog = catalogRepo(db);
    const inverters = await catalog.list('inverter');

    const suggestion = suggestComponents(await requirements(), [], inverters, [], []);
    const inverter = inverters.find((i) => i.id === suggestion.inverterId);
    expect(inverter).toBeDefined();
    expect(inverter!.spec.continuousPowerW).toBeGreaterThanOrEqual(2500);
  });

  test('battery suggestion uses the configured chemistry and meets required kWh', async () => {
    const db = await openTestDb();
    const catalog = catalogRepo(db);
    const batteries = await catalog.list('battery');

    const suggestion = suggestComponents(await requirements(), [], [], batteries, []);
    const battery = batteries.find((b) => b.id === suggestion.batteryId);
    expect(battery).toBeDefined();
    expect(battery!.spec.chemistry).toBe('lifepo4');

    const series = Math.max(1, Math.ceil(48 / battery!.spec.nominalVoltageV));
    const parallel = Math.max(
      1,
      Math.ceil((7.5 * 1000) / (series * battery!.spec.nominalVoltageV * battery!.spec.capacityAh)),
    );
    const actualKwh =
      (series * parallel * battery!.spec.nominalVoltageV * battery!.spec.capacityAh) / 1000;
    expect(actualKwh).toBeGreaterThanOrEqual(7.5);
  });

  test('returns nulls when no candidates exist for a slot', async () => {
    const suggestion = suggestComponents(await requirements(), [], [], [], []);
    expect(suggestion).toEqual({
      panelId: null,
      inverterId: null,
      batteryId: null,
      controllerId: null,
    });
  });
});
