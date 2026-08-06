import type {
  BatterySpec,
  CableSpec,
  ChargeControllerSpec,
  InverterSpec,
  PanelSpec,
} from '../../core/types';
import type { ComponentKind, ComponentRecord } from '../../data/types';
import { newId } from '../../utils/id';
import type { DatabaseLike } from '../types';

export type SpecByKind = {
  panel: PanelSpec;
  inverter: InverterSpec;
  battery: BatterySpec;
  controller: ChargeControllerSpec;
  cable: CableSpec;
};

/** Any component spec (union across kinds). */
export type AnySpec = SpecByKind[ComponentKind];

interface ComponentRow {
  id: string;
  kind: ComponentKind;
  brand: string;
  model: string;
  spec_json: string;
  is_reference: number;
  is_favorite: number;
}

function toRecord<K extends ComponentKind = ComponentKind>(
  row: ComponentRow,
): ComponentRecord<SpecByKind[K]> {
  return {
    id: row.id,
    kind: row.kind as K,
    brand: row.brand,
    model: row.model,
    spec: JSON.parse(row.spec_json) as SpecByKind[K],
    isReference: row.is_reference === 1,
    isFavorite: row.is_favorite === 1,
  };
}

export interface CatalogRepo {
  list<K extends ComponentKind>(kind: K): Promise<ComponentRecord<SpecByKind[K]>[]>;
  search<K extends ComponentKind>(
    kind: K,
    query: string,
    limit?: number,
  ): Promise<ComponentRecord<SpecByKind[K]>[]>;
  getById<K extends ComponentKind>(
    kind: K,
    id: string,
  ): Promise<ComponentRecord<SpecByKind[K]> | null>;
  create<K extends ComponentKind>(
    kind: K,
    brand: string,
    model: string,
    spec: SpecByKind[K],
  ): Promise<ComponentRecord<SpecByKind[K]>>;
  update<K extends ComponentKind>(
    kind: K,
    id: string,
    patch: Partial<{ brand: string; model: string; spec: SpecByKind[K] }>,
  ): Promise<void>;
  remove(kind: ComponentKind, id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  listFavorites(): Promise<ComponentRecord<AnySpec>[]>;
  count(kind?: ComponentKind): Promise<number>;
}

export function catalogRepo(db: DatabaseLike): CatalogRepo {
  const list = async <K extends ComponentKind>(
    kind: K,
  ): Promise<ComponentRecord<SpecByKind[K]>[]> => {
    const rows = await db.getAllAsync<ComponentRow>(
      'SELECT * FROM components WHERE kind = ? ORDER BY brand, model',
      [kind],
    );
    return rows.map((r) => toRecord<K>(r));
  };

  const search = async <K extends ComponentKind>(
    kind: K,
    query: string,
    limit = 100,
  ): Promise<ComponentRecord<SpecByKind[K]>[]> => {
    const q = `%${query.trim()}%`;
    const rows = await db.getAllAsync<ComponentRow>(
      `SELECT * FROM components
       WHERE kind = ? AND (brand LIKE ? OR model LIKE ?)
       ORDER BY brand, model
       LIMIT ?`,
      [kind, q, q, limit],
    );
    return rows.map((r) => toRecord<K>(r));
  };

  const getById = async <K extends ComponentKind>(
    kind: K,
    id: string,
  ): Promise<ComponentRecord<SpecByKind[K]> | null> => {
    const row = await db.getFirstAsync<ComponentRow>(
      'SELECT * FROM components WHERE kind = ? AND id = ?',
      [kind, id],
    );
    return row ? toRecord<K>(row) : null;
  };

  return {
    list,
    search,
    getById,
    create: async (kind, brand, model, spec) => {
      const id = newId();
      await db.runAsync(
        `INSERT INTO components (id, kind, brand, model, spec_json)
         VALUES (?, ?, ?, ?, ?)`,
        [id, kind, brand, model, JSON.stringify(spec)],
      );
      return { id, kind, brand, model, spec, isReference: false, isFavorite: false };
    },
    update: async (kind, id, patch) => {
      const row = await db.getFirstAsync<ComponentRow>(
        'SELECT * FROM components WHERE kind = ? AND id = ?',
        [kind, id],
      );
      if (!row) throw new Error(`Component not found: ${kind}/${id}`);
      const brand = patch.brand ?? row.brand;
      const model = patch.model ?? row.model;
      const spec = patch.spec ? JSON.stringify(patch.spec) : row.spec_json;
      await db.runAsync(
        "UPDATE components SET brand = ?, model = ?, spec_json = ?, updated_at = datetime('now') WHERE id = ?",
        [brand, model, spec, id],
      );
    },
    remove: async (kind, id) => {
      await db.runAsync('DELETE FROM components WHERE kind = ? AND id = ?', [kind, id]);
    },
    setFavorite: async (id, favorite) => {
      await db.runAsync('UPDATE components SET is_favorite = ? WHERE id = ?', [
        favorite ? 1 : 0,
        id,
      ]);
    },
    listFavorites: async () => {
      const rows = await db.getAllAsync<ComponentRow>(
        'SELECT * FROM components WHERE is_favorite = 1 ORDER BY brand, model',
      );
      return rows.map((r) => toRecord(r));
    },
    count: async (kind) => {
      const row = await db.getFirstAsync<{ n: number }>(
        kind
          ? 'SELECT COUNT(*) AS n FROM components WHERE kind = ?'
          : 'SELECT COUNT(*) AS n FROM components',
        kind ? [kind] : undefined,
      );
      return row?.n ?? 0;
    },
  };
}
