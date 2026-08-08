import type {
  BatteryChemistry,
  DesignResult,
  LoadItem,
  LoadMode,
  SystemInput,
  SystemType,
  SystemVoltage,
} from '../../core/types';
import type { ProjectExport } from '../../reports/jsonIO';
import type { PshLocation } from '../../data/types';
import { newId } from '../../utils/id';
import type { DatabaseLike } from '../types';
import { catalogRepo } from './catalog';
import { pshRepo } from './psh';

export interface ProjectRecord {
  id: string;
  name: string;
  clientName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioRecord {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  systemType: SystemType;
  systemVoltageV: SystemVoltage | null;
  chemistry: BatteryChemistry;
  autonomyDays: number;
  winterPsh: number;
  summerPsh: number;
  pshLocation: PshLocation | null;
  inverterEfficiency: number | null;
  systemLossFactor: number | null;
  dcVoltageDropPercent: number | null;
  acVoltageDropPercent: number | null;
  minTemperatureC: number | null;
  tempDeratingFactor: number | null;
  pvCableLengthM: number | null;
  dcCableLengthM: number | null;
  acCableLengthM: number | null;
  busbarRatingA: number | null;
  mainBreakerA: number | null;
  selectedPanelId: string | null;
  selectedInverterId: string | null;
  selectedBatteryId: string | null;
  selectedControllerId: string | null;
  loadMode: LoadMode;
  totalDailyKwh: number | null;
  totalPeakKw: number | null;
  totalSurgeKw: number | null;
  totalLoadIsAc: boolean;
  loads: LoadItem[];
  designResult: DesignResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewProjectInput {
  name: string;
  clientName?: string;
  notes?: string;
  scenario?: {
    name?: string;
    systemType?: SystemType;
    loads?: LoadItem[];
  };
}

export interface ScenarioPatch {
  name?: string;
  systemType?: SystemType;
  systemVoltageV?: SystemVoltage | null;
  chemistry?: BatteryChemistry;
  autonomyDays?: number;
  winterPsh?: number;
  summerPsh?: number;
  pshLocationId?: string | null;
  inverterEfficiency?: number | null;
  systemLossFactor?: number | null;
  dcVoltageDropPercent?: number | null;
  acVoltageDropPercent?: number | null;
  minTemperatureC?: number | null;
  tempDeratingFactor?: number | null;
  pvCableLengthM?: number | null;
  dcCableLengthM?: number | null;
  acCableLengthM?: number | null;
  busbarRatingA?: number | null;
  mainBreakerA?: number | null;
  selectedPanelId?: string | null;
  selectedInverterId?: string | null;
  selectedBatteryId?: string | null;
  selectedControllerId?: string | null;
  loadMode?: LoadMode;
  totalDailyKwh?: number | null;
  totalPeakKw?: number | null;
  totalSurgeKw?: number | null;
  totalLoadIsAc?: boolean;
  loads?: LoadItem[];
}

export interface ProjectWithScenarios extends ProjectRecord {
  scenarios: ScenarioRecord[];
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ScenarioRow {
  id: string;
  project_id: string;
  name: string;
  is_active: number;
  system_type: string;
  system_voltage_v: number | null;
  chemistry: string;
  autonomy_days: number;
  winter_psh: number;
  summer_psh: number;
  psh_location_id: string | null;
  inverter_efficiency: number | null;
  system_loss_factor: number | null;
  dc_voltage_drop_percent: number | null;
  ac_voltage_drop_percent: number | null;
  min_temperature_c: number | null;
  temp_derating_factor: number | null;
  pv_cable_length_m: number | null;
  dc_cable_length_m: number | null;
  ac_cable_length_m: number | null;
  busbar_rating_a: number | null;
  main_breaker_a: number | null;
  selected_panel_id: string | null;
  selected_inverter_id: string | null;
  selected_battery_id: string | null;
  selected_controller_id: string | null;
  load_mode: string;
  total_daily_kwh: number | null;
  total_peak_kw: number | null;
  total_surge_kw: number | null;
  total_load_is_ac: number;
  design_result_json: string | null;
  created_at: string;
  updated_at: string;
}

interface LoadRow {
  id: string;
  scenario_id: string;
  position: number;
  name: string;
  quantity: number;
  power_watts: number;
  hours_per_day: number;
  is_ac: number;
  is_simultaneous: number;
  is_inductive: number;
  surge_factor: number | null;
}

function toLoadItem(row: LoadRow): LoadItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    powerWatts: row.power_watts,
    hoursPerDay: row.hours_per_day,
    isAc: row.is_ac === 1,
    isSimultaneous: row.is_simultaneous === 1,
    isInductive: row.is_inductive === 1,
    surgeFactor: row.surge_factor ?? undefined,
  };
}

export interface ProjectRepo {
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectWithScenarios | null>;
  createProject(input: NewProjectInput): Promise<ProjectWithScenarios>;
  updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'clientName' | 'notes'>>,
  ): Promise<void>;
  deleteProject(id: string): Promise<void>;
  duplicateProject(id: string): Promise<ProjectWithScenarios>;
  importProject(backup: ProjectExport): Promise<ProjectWithScenarios>;

  getScenario(scenarioId: string): Promise<ScenarioRecord | null>;
  addScenario(projectId: string, patch?: ScenarioPatch): Promise<ScenarioRecord>;
  updateScenario(scenarioId: string, patch: ScenarioPatch): Promise<void>;
  setActiveScenario(projectId: string, scenarioId: string): Promise<void>;
  deleteScenario(scenarioId: string): Promise<void>;

  buildInput(scenarioId: string): Promise<SystemInput>;
  saveDesignResult(scenarioId: string, result: DesignResult): Promise<void>;
  getDesignResult(scenarioId: string): Promise<DesignResult | null>;
}

function applyPatch(patch: ScenarioPatch): {
  columns: string[];
  values: (string | number | null)[];
} {
  const columns: string[] = [];
  const values: (string | number | null)[] = [];
  const push = (col: string, value: string | number | null | undefined): void => {
    if (value === undefined) return;
    columns.push(`${col} = ?`);
    values.push(value as string | number | null);
  };
  push('name', patch.name);
  push('system_type', patch.systemType);
  push('system_voltage_v', patch.systemVoltageV);
  push('chemistry', patch.chemistry);
  push('autonomy_days', patch.autonomyDays);
  push('winter_psh', patch.winterPsh);
  push('summer_psh', patch.summerPsh);
  push('psh_location_id', patch.pshLocationId);
  push('inverter_efficiency', patch.inverterEfficiency);
  push('system_loss_factor', patch.systemLossFactor);
  push('dc_voltage_drop_percent', patch.dcVoltageDropPercent);
  push('ac_voltage_drop_percent', patch.acVoltageDropPercent);
  push('min_temperature_c', patch.minTemperatureC);
  push('temp_derating_factor', patch.tempDeratingFactor);
  push('pv_cable_length_m', patch.pvCableLengthM);
  push('dc_cable_length_m', patch.dcCableLengthM);
  push('ac_cable_length_m', patch.acCableLengthM);
  push('busbar_rating_a', patch.busbarRatingA);
  push('main_breaker_a', patch.mainBreakerA);
  push('selected_panel_id', patch.selectedPanelId);
  push('selected_inverter_id', patch.selectedInverterId);
  push('selected_battery_id', patch.selectedBatteryId);
  push('selected_controller_id', patch.selectedControllerId);
  push('load_mode', patch.loadMode);
  push('total_daily_kwh', patch.totalDailyKwh);
  push('total_peak_kw', patch.totalPeakKw);
  push('total_surge_kw', patch.totalSurgeKw);
  push(
    'total_load_is_ac',
    patch.totalLoadIsAc === undefined ? undefined : patch.totalLoadIsAc ? 1 : 0,
  );
  return { columns, values };
}

export function projectRepo(db: DatabaseLike): ProjectRepo {
  const catalog = catalogRepo(db);
  const psh = pshRepo(db);

  const loadScenario = async (row: ScenarioRow): Promise<ScenarioRecord> => {
    const [loads, pshLocation] = await Promise.all([
      db.getAllAsync<LoadRow>(
        'SELECT * FROM scenario_loads WHERE scenario_id = ? ORDER BY position',
        [row.id],
      ),
      row.psh_location_id ? psh.getById(row.psh_location_id) : Promise.resolve(null),
    ]);
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      isActive: row.is_active === 1,
      systemType: row.system_type as SystemType,
      systemVoltageV: row.system_voltage_v as SystemVoltage | null,
      chemistry: row.chemistry as BatteryChemistry,
      autonomyDays: row.autonomy_days,
      winterPsh: row.winter_psh,
      summerPsh: row.summer_psh,
      pshLocation,
      inverterEfficiency: row.inverter_efficiency,
      systemLossFactor: row.system_loss_factor,
      dcVoltageDropPercent: row.dc_voltage_drop_percent,
      acVoltageDropPercent: row.ac_voltage_drop_percent,
      minTemperatureC: row.min_temperature_c,
      tempDeratingFactor: row.temp_derating_factor,
      pvCableLengthM: row.pv_cable_length_m,
      dcCableLengthM: row.dc_cable_length_m,
      acCableLengthM: row.ac_cable_length_m,
      busbarRatingA: row.busbar_rating_a,
      mainBreakerA: row.main_breaker_a,
      selectedPanelId: row.selected_panel_id,
      selectedInverterId: row.selected_inverter_id,
      selectedBatteryId: row.selected_battery_id,
      selectedControllerId: row.selected_controller_id,
      loadMode: row.load_mode as LoadMode,
      totalDailyKwh: row.total_daily_kwh,
      totalPeakKw: row.total_peak_kw,
      totalSurgeKw: row.total_surge_kw,
      totalLoadIsAc: row.total_load_is_ac === 1,
      loads: loads.map(toLoadItem),
      designResult: row.design_result_json
        ? (JSON.parse(row.design_result_json) as DesignResult)
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const insertLoads = async (
    exec: DatabaseLike,
    scenarioId: string,
    loads: LoadItem[],
  ): Promise<void> => {
    await exec.runAsync('DELETE FROM scenario_loads WHERE scenario_id = ?', [scenarioId]);
    for (let i = 0; i < loads.length; i += 1) {
      const load = loads[i];
      await exec.runAsync(
        `INSERT INTO scenario_loads
          (id, scenario_id, position, name, quantity, power_watts, hours_per_day,
           is_ac, is_simultaneous, is_inductive, surge_factor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId(),
          scenarioId,
          i,
          load.name,
          load.quantity,
          load.powerWatts,
          load.hoursPerDay,
          load.isAc ? 1 : 0,
          load.isSimultaneous ? 1 : 0,
          load.isInductive ? 1 : 0,
          load.surgeFactor ?? null,
        ],
      );
    }
  };

  const buildScenarioRow = async (scenarioId: string): Promise<ScenarioRow> => {
    const row = await db.getFirstAsync<ScenarioRow>('SELECT * FROM scenarios WHERE id = ?', [
      scenarioId,
    ]);
    if (!row) throw new Error(`Scenario not found: ${scenarioId}`);
    return row;
  };

  return {
    listProjects: async () => {
      const rows = await db.getAllAsync<ProjectRow>(
        'SELECT * FROM projects ORDER BY updated_at DESC',
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        clientName: r.client_name,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    getProject: async (id) => {
      const row = await db.getFirstAsync<ProjectRow>('SELECT * FROM projects WHERE id = ?', [id]);
      if (!row) return null;
      const scenarioRows = await db.getAllAsync<ScenarioRow>(
        'SELECT * FROM scenarios WHERE project_id = ? ORDER BY created_at',
        [id],
      );
      const scenarios = await Promise.all(scenarioRows.map(loadScenario));
      return {
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        scenarios,
      };
    },
    createProject: async (input) => {
      const projectId = newId();
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(
          `INSERT INTO projects (id, name, client_name, notes)
           VALUES (?, ?, ?, ?)`,
          [projectId, input.name, input.clientName ?? '', input.notes ?? ''],
        );
        const scenarioId = newId();
        await txn.runAsync(
          `INSERT INTO scenarios
            (id, project_id, name, is_active, system_type, autonomy_days, winter_psh, summer_psh)
           VALUES (?, ?, ?, 1, ?, 2, 4.0, 6.0)`,
          [
            scenarioId,
            projectId,
            input.scenario?.name ?? 'Base design',
            input.scenario?.systemType ?? 'off-grid',
          ],
        );
        await insertLoads(txn, scenarioId, input.scenario?.loads ?? []);
      });
      const project = await (await projectRepo(db)).getProject(projectId);
      if (!project) throw new Error('Failed to create project');
      return project;
    },
    updateProject: async (id, patch) => {
      const row = await db.getFirstAsync<ProjectRow>('SELECT * FROM projects WHERE id = ?', [id]);
      if (!row) throw new Error(`Project not found: ${id}`);
      await db.runAsync(
        `UPDATE projects SET name = ?, client_name = ?, notes = ?,
         updated_at = datetime('now') WHERE id = ?`,
        [patch.name ?? row.name, patch.clientName ?? row.client_name, patch.notes ?? row.notes, id],
      );
    },
    deleteProject: async (id) => {
      await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
    },
    duplicateProject: async (id) => {
      const source = await (await projectRepo(db)).getProject(id);
      if (!source) throw new Error(`Project not found: ${id}`);
      const projectId = newId();
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(
          `INSERT INTO projects (id, name, client_name, notes)
           VALUES (?, ?, ?, ?)`,
          [projectId, `${source.name} (copy)`, source.clientName, source.notes],
        );
        for (const scenario of source.scenarios) {
          const scenarioId = newId();
          await txn.runAsync(
            `INSERT INTO scenarios
              (id, project_id, name, is_active, system_type, system_voltage_v, chemistry,
               autonomy_days, winter_psh, summer_psh, psh_location_id, inverter_efficiency,
               system_loss_factor, dc_voltage_drop_percent, ac_voltage_drop_percent,
               min_temperature_c, temp_derating_factor, pv_cable_length_m, dc_cable_length_m,
               ac_cable_length_m, busbar_rating_a, main_breaker_a, selected_panel_id,
               selected_inverter_id, selected_battery_id, selected_controller_id,
               load_mode, total_daily_kwh, total_peak_kw, total_surge_kw, total_load_is_ac)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              scenarioId,
              projectId,
              scenario.name,
              scenario.isActive ? 1 : 0,
              scenario.systemType,
              scenario.systemVoltageV,
              scenario.chemistry,
              scenario.autonomyDays,
              scenario.winterPsh,
              scenario.summerPsh,
              scenario.pshLocation?.id ?? null,
              scenario.inverterEfficiency,
              scenario.systemLossFactor,
              scenario.dcVoltageDropPercent,
              scenario.acVoltageDropPercent,
              scenario.minTemperatureC,
              scenario.tempDeratingFactor,
              scenario.pvCableLengthM,
              scenario.dcCableLengthM,
              scenario.acCableLengthM,
              scenario.busbarRatingA,
              scenario.mainBreakerA,
              scenario.selectedPanelId,
              scenario.selectedInverterId,
              scenario.selectedBatteryId,
              scenario.selectedControllerId,
              scenario.loadMode,
              scenario.totalDailyKwh,
              scenario.totalPeakKw,
              scenario.totalSurgeKw,
              scenario.totalLoadIsAc ? 1 : 0,
            ],
          );
          await insertLoads(txn, scenarioId, scenario.loads);
        }
      });
      const project = await (await projectRepo(db)).getProject(projectId);
      if (!project) throw new Error('Failed to duplicate project');
      return project;
    },

    importProject: async (backup) => {
      const projectId = newId();
      const project = backup.project;
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(
          `INSERT INTO projects (id, name, client_name, notes)
           VALUES (?, ?, ?, ?)`,
          [projectId, project.name, project.clientName, project.notes],
        );
        for (const scenario of project.scenarios) {
          const scenarioId = newId();
          await txn.runAsync(
            `INSERT INTO scenarios
              (id, project_id, name, is_active, system_type, system_voltage_v, chemistry,
               autonomy_days, winter_psh, summer_psh, psh_location_id, inverter_efficiency,
               system_loss_factor, dc_voltage_drop_percent, ac_voltage_drop_percent,
               min_temperature_c, temp_derating_factor, pv_cable_length_m, dc_cable_length_m,
               ac_cable_length_m, busbar_rating_a, main_breaker_a, selected_panel_id,
               selected_inverter_id, selected_battery_id, selected_controller_id,
               load_mode, total_daily_kwh, total_peak_kw, total_surge_kw, total_load_is_ac,
               design_result_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              scenarioId,
              projectId,
              scenario.name,
              scenario.isActive ? 1 : 0,
              scenario.systemType,
              scenario.systemVoltageV,
              scenario.chemistry,
              scenario.autonomyDays,
              scenario.winterPsh,
              scenario.summerPsh,
              scenario.pshLocationId,
              scenario.inverterEfficiency,
              scenario.systemLossFactor,
              scenario.dcVoltageDropPercent,
              scenario.acVoltageDropPercent,
              scenario.minTemperatureC,
              scenario.tempDeratingFactor,
              scenario.pvCableLengthM,
              scenario.dcCableLengthM,
              scenario.acCableLengthM,
              scenario.busbarRatingA,
              scenario.mainBreakerA,
              scenario.selectedPanelId,
              scenario.selectedInverterId,
              scenario.selectedBatteryId,
              scenario.selectedControllerId,
              scenario.loadMode,
              scenario.totalDailyKwh,
              scenario.totalPeakKw,
              scenario.totalSurgeKw,
              scenario.totalLoadIsAc ? 1 : 0,
              scenario.designResult ? JSON.stringify(scenario.designResult) : null,
            ],
          );
          await insertLoads(txn, scenarioId, scenario.loads);
        }
      });
      const imported = await (await projectRepo(db)).getProject(projectId);
      if (!imported) throw new Error('Failed to import project');
      return imported;
    },

    getScenario: async (scenarioId) => loadScenario(await buildScenarioRow(scenarioId)),
    addScenario: async (projectId, patch = {}) => {
      const scenarioId = newId();
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(
          `INSERT INTO scenarios
            (id, project_id, name, is_active, system_type, system_voltage_v, chemistry,
             autonomy_days, winter_psh, summer_psh, psh_location_id, inverter_efficiency,
             system_loss_factor, dc_voltage_drop_percent, ac_voltage_drop_percent,
             min_temperature_c, temp_derating_factor, pv_cable_length_m, dc_cable_length_m,
             ac_cable_length_m, busbar_rating_a, main_breaker_a, selected_panel_id,
             selected_inverter_id, selected_battery_id, selected_controller_id,
             load_mode, total_daily_kwh, total_peak_kw, total_surge_kw, total_load_is_ac)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scenarioId,
            projectId,
            patch.name ?? 'Scenario',
            patch.systemType ?? 'off-grid',
            patch.systemVoltageV ?? null,
            patch.chemistry ?? 'lifepo4',
            patch.autonomyDays ?? 2,
            patch.winterPsh ?? 4.0,
            patch.summerPsh ?? 6.0,
            patch.pshLocationId ?? null,
            patch.inverterEfficiency ?? null,
            patch.systemLossFactor ?? null,
            patch.dcVoltageDropPercent ?? null,
            patch.acVoltageDropPercent ?? null,
            patch.minTemperatureC ?? null,
            patch.tempDeratingFactor ?? null,
            patch.pvCableLengthM ?? null,
            patch.dcCableLengthM ?? null,
            patch.acCableLengthM ?? null,
            patch.busbarRatingA ?? null,
            patch.mainBreakerA ?? null,
            patch.selectedPanelId ?? null,
            patch.selectedInverterId ?? null,
            patch.selectedBatteryId ?? null,
            patch.selectedControllerId ?? null,
            patch.loadMode ?? 'appliances',
            patch.totalDailyKwh ?? null,
            patch.totalPeakKw ?? null,
            patch.totalSurgeKw ?? null,
            (patch.totalLoadIsAc ?? true) ? 1 : 0,
          ],
        );
        if (patch.loads) await insertLoads(txn, scenarioId, patch.loads);
      });
      return loadScenario(await buildScenarioRow(scenarioId));
    },
    updateScenario: async (scenarioId, patch) => {
      const { columns, values } = applyPatch(patch);
      if (columns.length > 0) {
        await db.runAsync(
          `UPDATE scenarios SET ${columns.join(', ')},
           updated_at = datetime('now') WHERE id = ?`,
          [...values, scenarioId],
        );
      }
      if (patch.loads) {
        await db.runAsync("UPDATE scenarios SET updated_at = datetime('now') WHERE id = ?", [
          scenarioId,
        ]);
        await insertLoads(db, scenarioId, patch.loads);
      }
    },
    setActiveScenario: async (projectId, scenarioId) => {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync('UPDATE scenarios SET is_active = 0 WHERE project_id = ?', [projectId]);
        await txn.runAsync('UPDATE scenarios SET is_active = 1 WHERE id = ?', [scenarioId]);
      });
    },
    deleteScenario: async (scenarioId) => {
      await db.runAsync('DELETE FROM scenarios WHERE id = ?', [scenarioId]);
    },

    buildInput: async (scenarioId) => {
      const scenario = await (await projectRepo(db)).getScenario(scenarioId);
      if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
      const [panel, inverter, battery, controller] = await Promise.all([
        scenario.selectedPanelId
          ? catalog.getById('panel', scenario.selectedPanelId)
          : Promise.resolve(null),
        scenario.selectedInverterId
          ? catalog.getById('inverter', scenario.selectedInverterId)
          : Promise.resolve(null),
        scenario.selectedBatteryId
          ? catalog.getById('battery', scenario.selectedBatteryId)
          : Promise.resolve(null),
        scenario.selectedControllerId
          ? catalog.getById('controller', scenario.selectedControllerId)
          : Promise.resolve(null),
      ]);
      const input: SystemInput = {
        loads: scenario.loads,
        loadMode: scenario.loadMode,
        totalDailyKwh: scenario.totalDailyKwh ?? undefined,
        totalPeakKw: scenario.totalPeakKw ?? undefined,
        totalSurgeKw: scenario.totalSurgeKw ?? undefined,
        totalLoadIsAc: scenario.totalLoadIsAc,
        systemType: scenario.systemType,
        winterPsh: scenario.winterPsh,
        summerPsh: scenario.summerPsh,
        autonomyDays: scenario.autonomyDays,
        chemistry: scenario.chemistry,
        systemVoltageOverride: scenario.systemVoltageV ?? undefined,
        inverterEfficiency: scenario.inverterEfficiency ?? undefined,
        systemLossFactor: scenario.systemLossFactor ?? undefined,
        dcVoltageDropPercent: scenario.dcVoltageDropPercent ?? undefined,
        acVoltageDropPercent: scenario.acVoltageDropPercent ?? undefined,
        minTemperatureC: scenario.minTemperatureC ?? undefined,
        tempDeratingFactor: scenario.tempDeratingFactor ?? undefined,
        pvCableLengthM: scenario.pvCableLengthM ?? undefined,
        dcCableLengthM: scenario.dcCableLengthM ?? undefined,
        acCableLengthM: scenario.acCableLengthM ?? undefined,
        busbarRatingA: scenario.busbarRatingA ?? undefined,
        mainBreakerA: scenario.mainBreakerA ?? undefined,
      };
      const selected: SystemInput['selected'] = {};
      if (panel) selected.panel = panel.spec;
      if (inverter) selected.inverter = inverter.spec;
      if (battery) selected.battery = battery.spec;
      if (controller) selected.controller = controller.spec;
      input.selected = selected;
      return input;
    },
    saveDesignResult: async (scenarioId, result) => {
      await db.runAsync(
        `UPDATE scenarios SET design_result_json = ?,
         updated_at = datetime('now') WHERE id = ?`,
        [JSON.stringify(result), scenarioId],
      );
    },
    getDesignResult: async (scenarioId) => {
      const row = await db.getFirstAsync<{ design_result_json: string | null }>(
        'SELECT design_result_json FROM scenarios WHERE id = ?',
        [scenarioId],
      );
      return row?.design_result_json ? (JSON.parse(row.design_result_json) as DesignResult) : null;
    },
  };
}
