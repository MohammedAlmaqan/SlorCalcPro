import { catalogRepo } from '../repos/catalog';
import { openTestDb } from './helpers/testDb';

describe('catalogRepo', () => {
  it('lists seeded components by kind', async () => {
    const db = await openTestDb();
    const repo = catalogRepo(db);

    const panels = await repo.list('panel');
    expect(panels.length).toBeGreaterThanOrEqual(30);
    expect(panels[0].spec).toHaveProperty('pmaxW');
    expect(panels[0].isReference).toBe(true);
  });

  it('searches by brand or model', async () => {
    const db = await openTestDb();
    const repo = catalogRepo(db);

    const byBrand = await repo.search('panel', 'trina');
    expect(byBrand.length).toBeGreaterThan(0);
    expect(byBrand.every((p) => p.brand.toLowerCase().includes('trina'))).toBe(true);

    const byModel = await repo.search('panel', 'HJT');
    expect(byModel.some((p) => p.model.includes('HJT'))).toBe(true);
  });

  it('creates, updates, and deletes user components', async () => {
    const db = await openTestDb();
    const repo = catalogRepo(db);

    const created = await repo.create('panel', 'Acme', 'TEST-300', {
      id: '',
      brand: 'Acme',
      model: 'TEST-300',
      pmaxW: 300,
      vocV: 40,
      vmpV: 33,
      iscA: 10,
      impA: 9.2,
      tempCoeffPmax: -0.35,
      tempCoeffVoc: -0.29,
      maxSeriesFuseRating: 15,
      maxSystemVoltage: 1000,
    });
    expect(created.isReference).toBe(false);

    const fetched = await repo.getById('panel', created.id);
    expect(fetched?.spec.pmaxW).toBe(300);

    await repo.update('panel', created.id, { model: 'TEST-320' });
    const updated = await repo.getById('panel', created.id);
    expect(updated?.model).toBe('TEST-320');

    await repo.remove('panel', created.id);
    expect(await repo.getById('panel', created.id)).toBeNull();
  });

  it('tracks favorites', async () => {
    const db = await openTestDb();
    const repo = catalogRepo(db);

    await repo.setFavorite('panel-ref-mono-550', true);
    const favs = await repo.listFavorites();
    expect(favs.some((c) => c.id === 'panel-ref-mono-550')).toBe(true);

    await repo.setFavorite('panel-ref-mono-550', false);
    expect((await repo.listFavorites()).some((c) => c.id === 'panel-ref-mono-550')).toBe(false);
  });

  it('counts components by kind', async () => {
    const db = await openTestDb();
    const repo = catalogRepo(db);
    expect(await repo.count('battery')).toBeGreaterThan(10);
    expect(await repo.count()).toBeGreaterThan(80);
  });
});
