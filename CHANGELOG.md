# SlorCalcPro — Project Changelog & Status Tracker

> **Purpose:** Single source of truth for project progress. If work is interrupted, refer to this file to resume exactly where we left off.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Task fully completed and verified |
| 🔄 In progress | Currently being worked on |
| ⬜ Not started | Not yet begun |
| ⏸️ Blocked / Paused | Waiting on decision, dependency, or approval |

---

## 1. Project Overview

- **App:** SlorCalcPro — professional solar system design tool (Android)
- **Slug:** `solarcalcapp` · **Project ID:** `846fcdc9-f35f-4459-ac01-e5b45812e3f7` · **Owner:** `merathdev`
- **Platform:** Android only · **Connectivity:** 100% offline (no INTERNET permission)
- **Framework:** Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript strict
- **Target SDK:** Android 16 (API 36) — meets Play Store Aug 31, 2026 requirement
- **Source of truth for scope:** `Technical_Studay.md` (requirements) + `PLAN.md` (approved plan)
- **Decisions (confirmed by owner):** React Native Paper UI · No cost estimation in v1 · English only · Curated + editable component database

---

## 2. Phase Status Summary

| Phase | Deliverable | Est. | Status |
|-------|-------------|------|--------|
| P0 | Scaffold (Expo 57, TS strict, lint/prettier, router tabs, Paper theme, eas.json, INTERNET-strip plugin) | 0.5 wk | ✅ Done |
| P1 | Calculation engine (pure TS, compliance, audit trail, golden tests) | 1.5 wks | ✅ Done |
| P2 | Data layer (SQLite schema/migrations, seeds: catalog/PSH/presets, repos) | 1 wk | ✅ Done |
| P3 | Wizard UI (projects, load audit, location, system type, components, results) | 2 wks | ✅ Done |
| P4 | Viz & reports (SLD via SVG, PDF, BOM CSV, JSON backup/restore, scenario compare) | 1.5 wks | 🔄 In progress |
| P5 | Settings & polish (units, defaults, dark mode, wizard/expert, reference docs) | 1 wk | ⬜ Not started |
| P6 | QA & Ship (expo-doctor, tests, EAS AAB, Play Console checklist) | 1 wk | ⬜ Not started |

---

## 3. Detailed Log (most recent first)

### 2026-08-06 — Phase 3 complete (wizard UI)
- ✅ Catalog tab (`(tabs)/catalog.tsx`): 5 kind tabs (panels/inverters/batteries/controllers/cables), live search (client-side over store + repo), favorite toggle, add/edit/delete with confirm dialogs.
- ✅ `src/components/CatalogEditor.tsx` — per-kind typed spec forms (numeric/enum/text fields via declarative field definitions); `specToDraft`/`draftToSpec` round-trip tested (3 tests).
- ✅ Manual PSH entry: `ManualPshDialog` in wizard step 2 ("Add manual location") persists via `pshRepo.addManual` and selects the new location.
- ✅ Gates green: tsc ✓ · eslint ✓ · prettier ✓ · jest **88/88** ✓ · expo-doctor 20/20 ✓ · Metro bundle export ✓.
- ✅ Phase 3 fully done — the PLAN's P3 deliverable (projects, load audit, location, system type, component selection, results + warnings) is complete.

### 2026-08-06 — Phase 3a complete (stores + projects + design wizard)
- ✅ `src/store/` — `dbService` singleton + zustand slices: `projects` (list, create, duplicate, rename, delete, scenarios CRUD, active switch, design-result cache), `catalog` (typed lists/search/favorites/remove), `reference` (PSH + appliance presets), `settings` (theme mode persisted to SQLite).
- ✅ `src/app/_layout.tsx` — DB bootstrap gate: `initDatabase()` → `setDbService()` → load settings/reference → hide splash; theme follows persisted mode.
- ✅ `src/db/suggest.ts` — auto-suggest engine (pure, unit-tested): panel (min panels within MPPT string limits), inverter (smallest sufficient, surge + voltage match), battery (fewest cells meeting kWh at system voltage, chemistry-aware), controller (MPPT/PWM by size, min current + max PV voltage). 6 tests.
- ✅ `src/components/` — reusable Paper UI: `form.tsx` (NumberField/Stepper/Segmented/Toggle), `LoadEditor.tsx` (preset-driven editable load rows), `pickers.tsx` (searchable `ComponentSlot` + `PshPicker`), `results.tsx` (StatCard/WarningsList/AuditTrail), `WizardScaffold.tsx` (step header + nav).
- ✅ Projects home (`(tabs)/index.tsx`): project cards, FAB create, duplicate/rename/delete menus + confirm dialogs, empty state, pull-to-refresh.
- ✅ Design wizard (`src/components/DesignWizard.tsx`, routes `project/new` · `project/scenario/[scenarioId]`): 5 steps — project & load audit → location/PSH (city picker + manual override + min temp) → system type/chemistry/autonomy/voltage → component selection (auto-suggest or catalog pick; battery/controller hidden for on-grid) → live results (stat cards, compliance warnings, cables/OCPD summary, full audit trail). Save runs `designSystem()`, persists scenario patch + design result, and navigates on finish. Create + edit modes.
- ✅ Project detail (`project/[id].tsx`): scenario cards (active badge, design summary), set-active/edit/delete scenario, add scenario, rename/delete project.
- ✅ Gates green: tsc ✓ · eslint ✓ · prettier ✓ · jest **85/85** ✓ · expo-doctor ✓ · Metro bundle export ✓.
- 📌 Follow-ups: catalog tab full management UI (add/edit/delete parts), manual PSH add in wizard, wizard/expert mode & units (Phase 5).

### 2026-08-06 — Phase 2 complete (data layer)
- ✅ `src/db/types.ts` — `DatabaseLike` interface (async SQLite surface: exec/run/getFirst/getAll/transactions) + `SqlResult`; production uses expo-sqlite, tests use node:sqlite.
- ✅ `src/db/expoSqliteAdapter.ts` — wraps `expo-sqlite` `SQLiteDatabase` as `DatabaseLike` (`lastInsertRowId` matched to expo's casing).
- ✅ `src/db/__tests__/helpers/nodeDb.ts` — test-only in-memory adapter over `node:sqlite` (never bundled; excluded via `testPathIgnorePatterns`).
- ✅ `src/db/schema.ts` + `migrate.ts` — versioned migrations via `PRAGMA user_version`; tables: `components`, `psh_locations`, `appliance_presets`, `projects`, `scenarios`, `scenario_loads`, `settings`; FK cascades on; WAL.
- ✅ `src/db/seed.ts` — idempotent (`INSERT OR IGNORE`) one-time seed; marker `meta.seed_version` in settings so user deletions of reference parts persist.
- ✅ `src/db/index.ts` — `getDb()`/`initDatabase()`: open → migrate → seed once.
- ✅ Seed data (`src/data/`): **32 panels**, **26 inverters** (off-grid/hybrid/on-grid), **19 batteries** (LiFePO4/AGM/Flooded), **11 controllers** (MPPT/PWM), cables derived from the engine `CABLE_TABLE`, **37 PSH cities**, **20 appliance presets** — all realistic, consistent values; reference entries marked `is_reference`.
- ✅ Repos (`src/db/repos/`): `catalog` (typed CRUD by kind, search, favorites, count), `psh` (search + manual locations), `presets` (search + manual), `settings` (typed KV), `projects` (project/scenario/loads CRUD, active-scenario switch, duplicate with fresh ids, `buildInput()` reconstructs a full `SystemInput` with selected components resolved, `saveDesignResult`/`getDesignResult` cache).
- ✅ Tests: 5 new suites / 23 tests (migrate idempotency + cascades, seed counts + idempotency, catalog CRUD/search/favorites, psh/presets/settings, projects incl. engine round-trip and duplication) — **79/79 total green**.
- ✅ `tsconfig.json`: `"types": ["jest", "node"]` (needed for `node:sqlite`); added devDep `@types/node`; `jest` config adds `testPathIgnorePatterns` for `__tests__/helpers`.
- ✅ Gates green: tsc ✓ · eslint ✓ · prettier ✓ · jest 79/79 ✓ · expo-doctor 20/20 ✓ · Metro android bundle export ✓.

### 2026-08-06 — Phase 1 complete (calculation engine)
- ✅ `src/core/types.ts` — full domain model (`SystemInput`, `LoadItem`, `DesignResult`, component specs `PanelSpec`/`InverterSpec`/`BatterySpec`/`ChargeControllerSpec`, `CableResult`, `ProtectionResult`, `ComplianceResult`, `EngineeringWarning`, `LoadAudit`).
- ✅ `src/core/audit.ts` — `AuditTrail` (formula + input refs + value + note, capped, JSON-serializable).
- ✅ `src/core/data/cableTable.ts` — AWG↔mm² table, `selectCable` (next size up), `conductorArea` (2·L·I·ρ/ΔV), `voltageDropPercent` (NEC 690.7/690.8 §4.6).
- ✅ `src/core/data/referenceComponents.ts` — curated reference parts: 550 W mono panel, 6 kW string (grid), 5 kW hybrid (48 V), 48 V 100 Ah LiFePO4, 60 A MPPT; `referenceInverterFor(type)`.
- ✅ Formulas (study §2, hand-verified): `load.ts` (§2.1, inv-eff 0.9, surge ×5), `systemVoltage.ts` (§2.2), `pv.ts` (required W / string sizing, loss factor 0.75), `battery.ts` (§2.3, DoD lifepo4 0.8/flooded 0.5/agm-gel 0.6), `inverter.ts` (§2.4, ×1.25), `chargeController.ts` (§2.5, MPPT 0.94 / PWM 0.79, cold-Voc ×1.25), `cable.ts` (Isc×1.56 PV source), `protection.ts` (§4, 120% backfeed, standard OCPD).
- ✅ `src/core/standards/nec.ts` (690.7/690.8/690.9/705.12(B)/705.14) + `iec.ts` (62548 voltage drop & ampacity).
- ✅ `src/core/engine.ts` — `designSystem()` orchestrator: loads → voltage → inverter → PV → battery → controller → cables → protection → NEC/IEC compliance → warnings; includes hybrid/on-grid/off-grid path, battery-not-required info for on-grid.
- ✅ Golden tests (`jest-expo` preset): 8 suites / 56 tests green, incl. full end-to-end `engine.test.ts` worked example (§2 fixture) and per-formula fixtures.
- ✅ Fixed: hybrid compliance now uses inverter MPPT limits (not controller); DoD prefers selected battery's `recommendedDoD` over chemistry constant; ampacity warnings added for DC/AC circuits.
- ✅ `tsconfig.json`: added `"types": ["jest"]` (globals weren't auto-included); pinned `@types/jest@29.5.14` (doctor-expected; jest 29.7).
- ✅ Gates green: tsc ✓ · eslint ✓ · prettier ✓ · jest 56/56 ✓ · expo-doctor 20/20 ✓.

### 2026-08-06 — Phase 0 complete (scaffold)
- ✅ Created `PLAN.md` (approved by owner).
- ✅ Created this `CHANGELOG.md` tracking file.
- ✅ Scaffolded Expo SDK 57 (`expo@~57.0.11`, RN 0.86.2, React 19.2.3) using the default (expo-router + TS strict) template. Created in temp dir and merged into repo root (template refuses non-empty dirs).
- ✅ `package.json`: name `solarcalcpro`, version `0.1.0`; removed web/iOS/dev-demo deps (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-image`, `expo-web-browser`, `react-dom`, `react-native-web`); added `react-native-paper@5.15.3`, `zustand@5`, `@shopify/flash-list@2.3.2`, `@expo/vector-icons@15.1.1`, `expo-sqlite`, `expo-print`, `expo-sharing`, `expo-file-system`, `expo-localization`, `expo-haptics`, `expo-build-properties`, `react-native-svg`.
- ✅ `app.json`: name `SlorCalcPro`, slug `solarcalcapp`, owner `merathdev`, projectId `846fcdc9-f35f-4459-ac01-e5b45812e3f7`, android package `com.merathdev.solarcalcpro`, `orientation: default` (Android 16 large-screen rule), scheme `solarcalcapp`.
- ✅ Stripped `INTERNET` permission via `plugins/withNoInternetPermission.js` (verified in generated AndroidManifest).
- ✅ Target/compile SDK = **36**, minSdk = 24 (via RN 0.86 version catalog — meets Play's Aug 31, 2026 requirement).
- ✅ `eas.json` with `development` (APK), `preview` (APK), `production` (AAB, autoIncrement).
- ✅ Quality gates: ESLint (`eslint-config-expo` flat config), Prettier, TS strict — all green.
- ✅ Verification: `npx expo-doctor` 20/20 ✓ · Metro Android bundle export ✓ · `npx expo prebuild` plugin check ✓ (generated `android/` dir removed afterward — EAS CNG only).
- ✅ Demo screens replaced with 4 Paper-based tab placeholders (Projects/Catalog/Reports/Settings) + brand theme (`src/theme/index.ts`, MD3 light/dark).
- 📌 Version pins intentionally excluded from `expo.install` in package.json: `@shopify/flash-list` (2.3.2, current) and `expo-sharing` (57.0.9 — doctor expects unpublished 57.0.10).

### 2026-08-06 — Project kickoff
- ✅ Created `PLAN.md` (approved by owner).
- ✅ Created this `CHANGELOG.md` tracking file.

---

## 4. Completed Work Detail

### Phase 0 — Scaffold (done)
- Expo SDK 57 + React Native 0.86 + TypeScript strict + Expo Router (file-based) + React Native Paper (MD3 light/dark brand theme).
- `app.json` fully configured for Play (API 36, AAB-ready, no INTERNET permission).
- `eas.json` profiles configured for EAS remote builds.
- Quality gates (tsc/eslint/prettier/expo-doctor) installed and passing.
- Tab placeholder screens for Projects, Catalog, Reports, Settings.

### Phase 2 — Data Layer (done)
- Versioned SQLite schema (`PRAGMA user_version` migrations), idempotent one-time seeding, FK cascades.
- Curated seed catalog: panels/inverters/batteries/controllers/cables + 37 PSH cities + appliance presets.
- Repository layer (`catalog`, `psh`, `presets`, `settings`, `projects`) over a platform-agnostic `DatabaseLike` interface (expo-sqlite in-app, node:sqlite in tests).
- `buildInput()` reconstructs a full engine `SystemInput` from a stored scenario; design-result caching.
- 23 DB tests green (79 total).

### Phase 3 — Wizard UI (done)
- zustand stores + DB bootstrap gate; projects home with full CRUD; scenario management per project.
- 5-step design wizard (load audit → location/PSH → system type → components → results with warnings + audit trail), auto-suggest, catalog pickers, manual PSH entry.
- Catalog tab: searchable, editable, favorites, per-kind spec forms.
- 88 tests green (jest), expo-doctor 20/20.

### Phase 4 — Viz & Reports (in progress)
- Pure-TS report core in `src/reports/`: `bom.ts` (professional BOM with reference-component fallbacks), `csv.ts` (RFC 4180), `jsonIO.ts` (validated project backup/restore with format marker), `comparison.ts` (scenario metric compare), `sld.ts` (single-line diagram layout: PV→OCPD→controller→inverter→AC breaker→loads, battery branch off-grid).
- `pdfTemplate.ts` print-ready HTML (overview stats, HTML SLD, load audit, electrical summary, warnings, BOM) → expo-print.
- `SldView.tsx` react-native-svg renderer (color-coded node types, dashed DC branch, horizontal scroll).
- Reports tab: project/scenario pickers, stats + SLD + warnings, PDF/BOM CSV/JSON export via expo-print + expo-sharing, JSON restore via `File.pickFileAsync`, inline scenario comparison table.
- `projectRepo.importProject()` + store `importProject` for JSON restore.
- 101 tests green (jest), expo-doctor 20/20, Metro export OK.

## 5. Open Items / Blockers

- None. Phase 4 core (reports, SLD, PDF, backup/restore, compare) is implemented; remaining polish: PDF branding/logo asset, SLD SPD/isolator annotations in the SVG view.

---

## 6. Next Up — Phase 5: Settings & Polish

- Units & number formatting options, default PSH location, dark mode.
- Wizard/expert mode, expanded reference docs (NEC 690/705, IEC 62548).
- PDF branding polish and SLD annotation details (SPD, isolators, ATS) from Phase 4 follow-up.

---

## 7. Quality Gates (run before every commit)

1. `npx tsc --noEmit`
2. `npx expo-doctor`
3. `npx eslint .`
4. `npx prettier --check .`
5. `npx jest` (once test suite exists)

---

## 8. EAS / Release Notes

- Remote builds only (no local native builds).
- Profiles: `development` (internal APK) · `preview` · `production` (AAB, API 36).
- Keystore via EAS credentials + Play App Signing.
- `eas project:init` uses slug `solarcalcapp` / id `846fcdc9-f35f-4459-ac01-e5b45812e3f7` / owner `merathdev`.

---

## 9. Environment / Command Reference

| Command | Purpose |
|---------|---------|
| `npm run start` | Start Expo dev server |
| `npm run android` | Run on Android device/emulator |
| `npx eas build --profile development --platform android` | Internal APK |
| `npx eas build --profile production --platform android` | Release AAB |
| `npx tsc --noEmit` | Type check |
| `npx expo-doctor` | Expo health check |
| `npx jest` | Run tests |
