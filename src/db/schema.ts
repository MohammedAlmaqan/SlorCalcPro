/**
 * Versioned SQLite schema. The runner in `migrate.ts` applies each migration
 * in order and tracks the current version via `PRAGMA user_version`.
 *
 * NOTE: never mutate an existing migration — append a new one.
 */

export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
CREATE TABLE IF NOT EXISTS components (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('panel','inverter','battery','controller','cable')),
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  spec_json     TEXT NOT NULL,
  is_reference   INTEGER NOT NULL DEFAULT 0,
  is_favorite   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_components_kind ON components(kind);
CREATE INDEX IF NOT EXISTS idx_components_brand ON components(brand);
CREATE INDEX IF NOT EXISTS idx_components_kind_brand ON components(kind, brand);

CREATE TABLE IF NOT EXISTS psh_locations (
  id                TEXT PRIMARY KEY,
  country           TEXT NOT NULL,
  city              TEXT NOT NULL,
  latitude          REAL,
  longitude         REAL,
  winter_psh        REAL NOT NULL,
  summer_psh        REAL NOT NULL,
  recommended_tilt  REAL,
  is_manual         INTEGER NOT NULL DEFAULT 0,
  note              TEXT
);
CREATE INDEX IF NOT EXISTS idx_psh_city ON psh_locations(city);

CREATE TABLE IF NOT EXISTS appliance_presets (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  power_watts     REAL NOT NULL,
  hours_per_day   REAL NOT NULL,
  is_ac           INTEGER NOT NULL DEFAULT 1,
  is_simultaneous INTEGER NOT NULL DEFAULT 0,
  is_inductive    INTEGER NOT NULL DEFAULT 0,
  surge_factor    REAL,
  is_manual       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_presets_name ON appliance_presets(name);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scenarios (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  is_active               INTEGER NOT NULL DEFAULT 0,
  system_type             TEXT NOT NULL DEFAULT 'off-grid',
  system_voltage_v        INTEGER,
  chemistry               TEXT NOT NULL DEFAULT 'lifepo4',
  autonomy_days           REAL NOT NULL DEFAULT 2,
  winter_psh              REAL NOT NULL DEFAULT 4.0,
  summer_psh              REAL NOT NULL DEFAULT 6.0,
  psh_location_id         TEXT REFERENCES psh_locations(id),
  inverter_efficiency     REAL,
  system_loss_factor      REAL,
  dc_voltage_drop_percent REAL,
  ac_voltage_drop_percent REAL,
  min_temperature_c       REAL,
  temp_derating_factor    REAL,
  pv_cable_length_m       REAL,
  dc_cable_length_m       REAL,
  ac_cable_length_m       REAL,
  busbar_rating_a         REAL,
  main_breaker_a          REAL,
  selected_panel_id       TEXT,
  selected_inverter_id    TEXT,
  selected_battery_id     TEXT,
  selected_controller_id  TEXT,
  design_result_json      TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scenarios_project ON scenarios(project_id);

CREATE TABLE IF NOT EXISTS scenario_loads (
  id              TEXT PRIMARY KEY,
  scenario_id     TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  name            TEXT NOT NULL,
  quantity        REAL NOT NULL DEFAULT 1,
  power_watts     REAL NOT NULL,
  hours_per_day   REAL NOT NULL,
  is_ac           INTEGER NOT NULL DEFAULT 1,
  is_simultaneous INTEGER NOT NULL DEFAULT 0,
  is_inductive    INTEGER NOT NULL DEFAULT 0,
  surge_factor    REAL
);
CREATE INDEX IF NOT EXISTS idx_loads_scenario ON scenario_loads(scenario_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
  },
  {
    version: 2,
    up: `
ALTER TABLE scenarios ADD COLUMN load_mode TEXT NOT NULL DEFAULT 'appliances';
ALTER TABLE scenarios ADD COLUMN total_daily_kwh REAL;
ALTER TABLE scenarios ADD COLUMN total_peak_kw REAL;
ALTER TABLE scenarios ADD COLUMN total_surge_kw REAL;
ALTER TABLE scenarios ADD COLUMN total_load_is_ac INTEGER NOT NULL DEFAULT 1;
`,
  },
];
