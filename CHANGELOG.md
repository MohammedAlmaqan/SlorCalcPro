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
| P2 | Data layer (SQLite schema/migrations, seeds: catalog/PSH/presets, repos) | 1 wk | ⬜ Not started |
| P3 | Wizard UI (projects, load audit, location, system type, components, results) | 2 wks | ⬜ Not started |
| P4 | Viz & reports (SLD via SVG, PDF, BOM CSV, JSON backup/restore, scenario compare) | 1.5 wks | ⬜ Not started |
| P5 | Settings & polish (units, defaults, dark mode, wizard/expert, reference docs) | 1 wk | ⬜ Not started |
| P6 | QA & Ship (expo-doctor, tests, EAS AAB, Play Console checklist) | 1 wk | ⬜ Not started |

---

## 3. Detailed Log (most recent first)

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

### Phase 1 — Calculation Engine (done)
- Pure-TS modules for every §2 formula with strict typing and hand-computed golden fixtures.
- NEC 690/705 + IEC 62548 compliance checks and a capped, serializable audit trail.
- `designSystem()` end-to-end orchestrator covering off-grid/hybrid/on-grid designs.
- 56 unit/integration tests green under `jest-expo`.

## 5. Open Items / Blockers

- None. Phase 2 (data layer) is the next work stream.

## 6. Next Up — Phase 2: Data Layer (SQLite)
- `expo-sqlite` schema + migrations for projects, load lists, component catalog (panels/inverters/batteries/controllers), PSH locations, wire presets, audit snapshots.
- Seed data: curated catalog from `referenceComponents.ts`, PSH per `Technical_Studay.md` Annex, presets.
- Repository modules (`src/data/`) abstracting SQLite + zustand in-memory caching.

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
