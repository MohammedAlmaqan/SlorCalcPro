import type { AppliancePreset } from '../../data/types';
import { newId } from '../../utils/id';
import type { DatabaseLike } from '../types';

interface PresetRow {
  id: string;
  name: string;
  power_watts: number;
  hours_per_day: number;
  is_ac: number;
  is_simultaneous: number;
  is_inductive: number;
  surge_factor: number | null;
  is_manual: number;
}

function toPreset(row: PresetRow): AppliancePreset {
  return {
    id: row.id,
    name: row.name,
    powerWatts: row.power_watts,
    hoursPerDay: row.hours_per_day,
    isAc: row.is_ac === 1,
    isSimultaneous: row.is_simultaneous === 1,
    isInductive: row.is_inductive === 1,
    surgeFactor: row.surge_factor ?? undefined,
  };
}

export interface PresetRepo {
  all(): Promise<AppliancePreset[]>;
  search(query: string, limit?: number): Promise<AppliancePreset[]>;
  getById(id: string): Promise<AppliancePreset | null>;
  addManual(entry: Omit<AppliancePreset, 'id'>): Promise<AppliancePreset>;
  removeManual(id: string): Promise<void>;
}

export function presetRepo(db: DatabaseLike): PresetRepo {
  return {
    all: async () => {
      const rows = await db.getAllAsync<PresetRow>('SELECT * FROM appliance_presets ORDER BY name');
      return rows.map(toPreset);
    },
    search: async (query, limit = 20) => {
      const q = `%${query.trim()}%`;
      const rows = await db.getAllAsync<PresetRow>(
        'SELECT * FROM appliance_presets WHERE name LIKE ? ORDER BY name LIMIT ?',
        [q, limit],
      );
      return rows.map(toPreset);
    },
    getById: async (id) => {
      const row = await db.getFirstAsync<PresetRow>(
        'SELECT * FROM appliance_presets WHERE id = ?',
        [id],
      );
      return row ? toPreset(row) : null;
    },
    addManual: async (entry) => {
      const id = newId();
      await db.runAsync(
        `INSERT INTO appliance_presets
          (id, name, power_watts, hours_per_day, is_ac, is_simultaneous, is_inductive, surge_factor, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          entry.name,
          entry.powerWatts,
          entry.hoursPerDay,
          entry.isAc ? 1 : 0,
          entry.isSimultaneous ? 1 : 0,
          entry.isInductive ? 1 : 0,
          entry.surgeFactor ?? null,
        ],
      );
      return { ...entry, id };
    },
    removeManual: async (id) => {
      await db.runAsync('DELETE FROM appliance_presets WHERE id = ? AND is_manual = 1', [id]);
    },
  };
}
