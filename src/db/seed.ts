import { SEED_BATTERIES } from '../data/batteries';
import { SEED_CABLES } from '../data/cables';
import { SEED_CONTROLLERS } from '../data/controllers';
import { SEED_INVERTERS } from '../data/inverters';
import { SEED_PANELS } from '../data/panels';
import { SEED_PRESETS } from '../data/presets';
import { SEED_PSH } from '../data/psh';
import type { DatabaseLike } from './types';

/**
 * Insert reference (seed) data. Uses `INSERT OR IGNORE` keyed on stable ids,
 * so it is safe to run on every app start without duplicating rows.
 */
export async function seed(db: DatabaseLike): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const panel of SEED_PANELS) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO components
          (id, kind, brand, model, spec_json, is_reference)
         VALUES (?, 'panel', ?, ?, ?, 1)`,
        [panel.id, panel.brand, panel.model, JSON.stringify(panel)],
      );
    }
    for (const inv of SEED_INVERTERS) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO components
          (id, kind, brand, model, spec_json, is_reference)
         VALUES (?, 'inverter', ?, ?, ?, 1)`,
        [inv.id, inv.brand, inv.model, JSON.stringify(inv)],
      );
    }
    for (const bat of SEED_BATTERIES) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO components
          (id, kind, brand, model, spec_json, is_reference)
         VALUES (?, 'battery', ?, ?, ?, 1)`,
        [bat.id, bat.brand, bat.model, JSON.stringify(bat)],
      );
    }
    for (const ctrl of SEED_CONTROLLERS) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO components
          (id, kind, brand, model, spec_json, is_reference)
         VALUES (?, 'controller', ?, ?, ?, 1)`,
        [ctrl.id, ctrl.brand, ctrl.model, JSON.stringify(ctrl)],
      );
    }
    for (const cable of SEED_CABLES) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO components
          (id, kind, brand, model, spec_json, is_reference)
         VALUES (?, 'cable', 'Standard', ?, ?, 1)`,
        [cable.id, cable.awg ?? `${cable.crossSectionMm2} mm²`, JSON.stringify(cable)],
      );
    }

    for (const loc of SEED_PSH) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO psh_locations
          (id, country, city, latitude, longitude, winter_psh, summer_psh, recommended_tilt, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          loc.id,
          loc.country,
          loc.city,
          loc.latitude ?? null,
          loc.longitude ?? null,
          loc.winterPsh,
          loc.summerPsh,
          loc.recommendedTilt ?? null,
        ],
      );
    }

    for (const preset of SEED_PRESETS) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO appliance_presets
          (id, name, power_watts, hours_per_day, is_ac, is_simultaneous, is_inductive, surge_factor, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          preset.id,
          preset.name,
          preset.powerWatts,
          preset.hoursPerDay,
          preset.isAc ? 1 : 0,
          preset.isSimultaneous ? 1 : 0,
          preset.isInductive ? 1 : 0,
          preset.surgeFactor ?? null,
        ],
      );
    }
  });
}
