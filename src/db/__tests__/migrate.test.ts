import { CURRENT_SCHEMA_VERSION, migrate, schemaVersion } from '../migrate';
import { openMemoryDb } from './helpers/nodeDb';

describe('migrate', () => {
  it('creates all tables and records the schema version', async () => {
    const db = openMemoryDb();
    await migrate(db);
    expect(await schemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'components',
        'psh_locations',
        'appliance_presets',
        'projects',
        'scenarios',
        'scenario_loads',
        'settings',
      ]),
    );
  });

  it('is idempotent on a fresh database', async () => {
    const db = openMemoryDb();
    await migrate(db);
    await migrate(db);
    expect(await schemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('enables foreign-key cascades for scenarios', async () => {
    const db = openMemoryDb();
    await migrate(db);
    await db.runAsync("INSERT INTO projects (id, name) VALUES ('p1', 'Demo')");
    await db.runAsync(`INSERT INTO scenarios (id, project_id, name) VALUES ('s1', 'p1', 'Base')`);
    await db.runAsync("DELETE FROM projects WHERE id = 'p1'");
    const left = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM scenarios');
    expect(left?.n).toBe(0);
  });
});
