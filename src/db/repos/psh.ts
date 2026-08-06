import type { PshLocation } from '../../data/types';
import { newId } from '../../utils/id';
import type { DatabaseLike } from '../types';

interface PshRow {
  id: string;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  winter_psh: number;
  summer_psh: number;
  recommended_tilt: number | null;
  is_manual: number;
  note: string | null;
}

function toLocation(row: PshRow): PshLocation {
  return {
    id: row.id,
    country: row.country,
    city: row.city,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    winterPsh: row.winter_psh,
    summerPsh: row.summer_psh,
    recommendedTilt: row.recommended_tilt ?? undefined,
    isManual: row.is_manual === 1,
    note: row.note ?? undefined,
  };
}

export interface PshRepo {
  all(): Promise<PshLocation[]>;
  search(query: string, limit?: number): Promise<PshLocation[]>;
  getById(id: string): Promise<PshLocation | null>;
  addManual(entry: Omit<PshLocation, 'id' | 'isManual'>): Promise<PshLocation>;
  removeManual(id: string): Promise<void>;
}

export function pshRepo(db: DatabaseLike): PshRepo {
  return {
    all: async () => {
      const rows = await db.getAllAsync<PshRow>(
        'SELECT * FROM psh_locations ORDER BY country, city',
      );
      return rows.map(toLocation);
    },
    search: async (query, limit = 20) => {
      const q = `%${query.trim()}%`;
      const rows = await db.getAllAsync<PshRow>(
        `SELECT * FROM psh_locations
         WHERE city LIKE ? OR country LIKE ?
         ORDER BY (CASE WHEN city LIKE ? THEN 0 ELSE 1 END), city
         LIMIT ?`,
        [q, q, q, limit],
      );
      return rows.map(toLocation);
    },
    getById: async (id) => {
      const row = await db.getFirstAsync<PshRow>('SELECT * FROM psh_locations WHERE id = ?', [id]);
      return row ? toLocation(row) : null;
    },
    addManual: async (entry) => {
      const id = newId();
      await db.runAsync(
        `INSERT INTO psh_locations
          (id, country, city, latitude, longitude, winter_psh, summer_psh, recommended_tilt, is_manual, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          id,
          entry.country,
          entry.city,
          entry.latitude ?? null,
          entry.longitude ?? null,
          entry.winterPsh,
          entry.summerPsh,
          entry.recommendedTilt ?? null,
          entry.note ?? null,
        ],
      );
      return { ...entry, id, isManual: true };
    },
    removeManual: async (id) => {
      await db.runAsync('DELETE FROM psh_locations WHERE id = ? AND is_manual = 1', [id]);
    },
  };
}
