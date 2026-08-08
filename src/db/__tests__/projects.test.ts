import { designSystem } from '../../core/engine';
import type { LoadItem } from '../../core/types';
import { projectRepo } from '../repos/projects';
import { openTestDb } from './helpers/testDb';

const LOADS: LoadItem[] = [
  {
    id: 'l1',
    name: 'LED Bulbs',
    quantity: 5,
    powerWatts: 9,
    hoursPerDay: 4,
    isAc: true,
    isSimultaneous: true,
    isInductive: false,
  },
  {
    id: 'l2',
    name: 'Fridge',
    quantity: 1,
    powerWatts: 150,
    hoursPerDay: 8,
    isAc: true,
    isSimultaneous: false,
    isInductive: true,
    surgeFactor: 5,
  },
  {
    id: 'l3',
    name: 'Water Pump',
    quantity: 1,
    powerWatts: 750,
    hoursPerDay: 2,
    isAc: true,
    isSimultaneous: false,
    isInductive: true,
    surgeFactor: 5,
  },
  {
    id: 'l4',
    name: 'Laptop',
    quantity: 1,
    powerWatts: 65,
    hoursPerDay: 6,
    isAc: true,
    isSimultaneous: true,
    isInductive: false,
  },
];

describe('projectRepo', () => {
  it('creates a project with a scenario and loads', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({
      name: 'Villa Backup',
      clientName: 'A. Client',
      scenario: { name: 'Base', loads: LOADS },
    });

    expect(project.name).toBe('Villa Backup');
    expect(project.scenarios).toHaveLength(1);
    expect(project.scenarios[0].loads).toHaveLength(4);
    expect(project.scenarios[0].isActive).toBe(true);
  });

  it('builds a SystemInput from a scenario with selected components', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({
      name: 'Hybrid Site',
      scenario: {
        loads: LOADS,
        systemType: 'hybrid',
      },
    });
    const scenario = project.scenarios[0];

    await repo.updateScenario(scenario.id, {
      systemVoltageV: 48,
      selectedPanelId: 'panel-ref-mono-550',
      selectedInverterId: 'inv-hybrid-ref-5000',
      selectedBatteryId: 'bat-lfp-ref-100',
      selectedControllerId: 'ctrl-mppt-60',
    });

    const input = await repo.buildInput(scenario.id);
    expect(input.systemType).toBe('hybrid');
    expect(input.systemVoltageOverride).toBe(48);
    expect(input.selected?.panel?.pmaxW).toBe(550);
    expect(input.selected?.inverter?.batteryVoltageV).toBe(48);
    expect(input.selected?.battery?.capacityAh).toBe(100);
    expect(input.loads).toHaveLength(4);

    const result = designSystem(input);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    expect(result.pv.actualArrayWatts).toBeGreaterThan(0);
  });

  it('stores and retrieves a cached design result', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'Cache Test', scenario: { loads: LOADS } });
    const scenario = project.scenarios[0];
    const input = await repo.buildInput(scenario.id);

    await repo.saveDesignResult(scenario.id, designSystem(input));
    const cached = await repo.getDesignResult(scenario.id);
    expect(cached?.dailyLoad.totalWhPerDay).toBeCloseTo(3270, 1);
  });

  it('supports multiple scenarios and switching the active one', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'Compare', scenario: { loads: LOADS } });
    await repo.addScenario(project.id, { name: '12V', systemVoltageV: 12 });
    await repo.addScenario(project.id, { name: '48V', systemVoltageV: 48 });

    const reloaded = await repo.getProject(project.id);
    expect(reloaded?.scenarios).toHaveLength(3);

    const second = reloaded!.scenarios[1];
    await repo.setActiveScenario(project.id, second.id);
    const after = await repo.getProject(project.id);
    const active = after?.scenarios.find((s) => s.isActive);
    expect(active?.id).toBe(second.id);
  });

  it('duplicates a project including loads', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'Original', scenario: { loads: LOADS } });
    const copy = await repo.duplicateProject(project.id);

    expect(copy.name).toBe('Original (copy)');
    expect(copy.scenarios).toHaveLength(1);
    expect(copy.scenarios[0].loads).toHaveLength(4);
    expect(copy.id).not.toBe(project.id);
  });

  it('persists total load mode and round-trips through buildInput', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'Meter Site' });
    const scenario = project.scenarios[0];

    await repo.updateScenario(scenario.id, {
      loadMode: 'total',
      totalDailyKwh: 12.5,
      totalPeakKw: 3.2,
      totalSurgeKw: 6.4,
      totalLoadIsAc: true,
      loads: [],
    });

    const reloaded = await repo.getScenario(scenario.id);
    expect(reloaded?.loadMode).toBe('total');
    expect(reloaded?.totalDailyKwh).toBe(12.5);
    expect(reloaded?.totalPeakKw).toBe(3.2);
    expect(reloaded?.totalSurgeKw).toBe(6.4);
    expect(reloaded?.totalLoadIsAc).toBe(true);

    const input = await repo.buildInput(scenario.id);
    expect(input.loadMode).toBe('total');
    expect(input.totalDailyKwh).toBe(12.5);
    expect(input.totalPeakKw).toBe(3.2);
    expect(input.totalSurgeKw).toBe(6.4);
    expect(input.totalLoadIsAc).toBe(true);
  });

  it('duplicates a project preserving total load mode fields', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'Total Original' });
    const scenario = project.scenarios[0];
    await repo.updateScenario(scenario.id, {
      loadMode: 'total',
      totalDailyKwh: 8,
      totalPeakKw: 2,
      totalSurgeKw: 4,
      totalLoadIsAc: false,
      loads: [],
    });

    const copy = await repo.duplicateProject(project.id);
    const copied = copy.scenarios[0];
    expect(copied.loadMode).toBe('total');
    expect(copied.totalDailyKwh).toBe(8);
    expect(copied.totalPeakKw).toBe(2);
    expect(copied.totalSurgeKw).toBe(4);
    expect(copied.totalLoadIsAc).toBe(false);
  });

  it('deletes a project and cascades scenarios', async () => {
    const db = await openTestDb();
    const repo = projectRepo(db);

    const project = await repo.createProject({ name: 'To Delete', scenario: { loads: LOADS } });
    await repo.deleteProject(project.id);

    expect(await repo.getProject(project.id)).toBeNull();
    const scenarios = await db.getAllAsync('SELECT * FROM scenarios');
    const loads = await db.getAllAsync('SELECT * FROM scenario_loads');
    expect(scenarios).toHaveLength(0);
    expect(loads).toHaveLength(0);
  });
});
