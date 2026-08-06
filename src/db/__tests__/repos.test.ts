import { pshRepo } from '../repos/psh';
import { presetRepo } from '../repos/presets';
import { settingsRepo } from '../repos/settings';
import { openTestDb } from './helpers/testDb';

describe('pshRepo', () => {
  it('searches cities case-insensitively', async () => {
    const db = await openTestDb();
    const repo = pshRepo(db);
    const results = await repo.search('dubai');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].city.toLowerCase()).toBe('dubai');
  });

  it('supports adding and removing manual locations', async () => {
    const db = await openTestDb();
    const repo = pshRepo(db);
    const added = await repo.addManual({
      country: 'Testland',
      city: 'Testerton',
      winterPsh: 4.0,
      summerPsh: 6.0,
      recommendedTilt: 30,
    });
    expect(added.isManual).toBe(true);
    expect((await repo.getById(added.id))?.city).toBe('Testerton');

    await repo.removeManual(added.id);
    expect(await repo.getById(added.id)).toBeNull();
  });
});

describe('presetRepo', () => {
  it('lists seeded appliance presets', async () => {
    const db = await openTestDb();
    const repo = presetRepo(db);
    const all = await repo.all();
    expect(all.length).toBeGreaterThanOrEqual(18);
    expect(all.find((p) => p.name === 'Refrigerator 150W')?.isInductive).toBe(true);
  });

  it('searches presets by name', async () => {
    const db = await openTestDb();
    const repo = presetRepo(db);
    const results = await repo.search('kettle');
    expect(results.some((p) => p.name.includes('Kettle'))).toBe(true);
  });
});

describe('settingsRepo', () => {
  it('stores and reads typed values', async () => {
    const db = await openTestDb();
    const repo = settingsRepo(db);

    expect(await repo.get('missing')).toBeNull();
    await repo.setNumber('default.psh', 4.5);
    expect(await repo.getNumber('default.psh')).toBeCloseTo(4.5, 5);

    await repo.setBoolean('theme.dark', true);
    expect(await repo.getBoolean('theme.dark')).toBe(true);
    await repo.setBoolean('theme.dark', false);
    expect(await repo.getBoolean('theme.dark')).toBe(false);

    await repo.remove('theme.dark');
    expect(await repo.get('theme.dark')).toBeNull();
  });
});
