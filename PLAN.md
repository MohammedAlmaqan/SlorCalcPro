# SlorCalcPro — Android Solar System Design App: Full Professional Plan

Based on `Technical_Studay.md` + confirmed decisions (React Native Paper, no cost estimation in v1, English-only, curated + editable component database).

---

## 1. Executive Summary

| Item | Decision |
|---|---|
| **Platform** | Android only (Play Store via EAS remote build, AAB) |
| **Connectivity** | 100% offline — core calcs, database, reports all local. No internet permission. |
| **Framework** | Expo SDK **57** (latest, Jun 2026) → React Native 0.86 / React 19.2, New Architecture, **targetSdk 36** (meets Play's Aug 31, 2026 requirement) |
| **Language** | TypeScript (strict) — all solar logic in **pure TS** (platform-agnostic, per study §7) |
| **UI** | React Native Paper (Material), dark/light mode |
| **Storage** | SQLite (`expo-sqlite`), seeded offline datasets + user data |
| **Reports** | PDF (via `expo-print`, local HTML→PDF), BOM CSV, project JSON backup |
| **Navigation** | Expo Router (file-based) |
| **ID** | slug `solarcalcapp`, id `846fcdc9-f35f-4459-ac01-e5b45812e3f7`, owner `merathdev` |

---

## 2. Tech Stack (pinned versions, all offline-capable)

| Concern | Library | Why |
|---|---|---|
| Runtime | `expo@^57` | Latest stable; targets Android 16 / API 36 by default |
| Build | `eas-cli`, `eas.json` | Remote builds only (no local native builds) |
| Navigation | `expo-router` | File-based, typed, stable |
| State | `zustand` | Light, offline, no persistence conflict |
| Persistence | `expo-sqlite` | Local DB for projects + component catalogs |
| PDF | `expo-print` + `expo-sharing` | Local HTML→PDF, share to files/apps, works offline |
| Files | `expo-file-system` | CSV/JSON/PDF writes |
| Diagram | `react-native-svg` | Single-line diagram (SLD) drawing |
| Lists | `@shopify/flash-list` | Long component lists, performant |
| UI kit | `react-native-paper` | Material components, tables/inputs/forms, dark mode |
| Haptics | `expo-haptics` | Professional input feedback (optional) |
| Locale format | `expo-localization` | Number/unit formatting |
| Manifest tweaks | `expo-build-properties`, small config plugin | Force `targetSdk 36`, strip `INTERNET` permission |
| Tests | `jest-expo`, `@testing-library/react-native` | Golden tests for engine, component tests |
| Quality | `typescript`, `eslint-config-expo`, `prettier` | Per study §"Type Checking & Linting" |

> **Fallback note:** SDK 56 is one version older but very stable; if any library lags SDK 57 we can pin to 56 without losing API-36 targeting.

---

## 3. Play Store Compliance Plan (critical)

1. **targetSdk 36** (Android 16) — required for new apps from **Aug 31, 2026**. Expo SDK 56+ targets 36 by default; we explicitly pin via `expo-build-properties` and verify in `npx expo-doctor`.
2. **No INTERNET permission** — we strip it via a config plugin. This *proves* offline-first and makes the Data Safety form trivial ("No data collected/shared").
3. **AAB + 64-bit + signing** — handled by EAS with Play App Signing (upload key managed by EAS credentials).
4. **Edge-to-edge & resizable** — SDK 56+ renders edge-to-edge by default; app must not lock orientation (Android 16 large-screen rules) — enforced in config.
5. **Privacy policy** (hosted URL) + **Data Safety** ("does not collect/transmit data"), **Content rating** (Everyone), store screenshots, short/long description, feature graphic.
6. **No special permissions** — no camera, no location (PSH is manual/bundled), no background services.

---

## 4. Offline Strategy

- **Solar data:** a **bundled offline Peak-Sun-Hours (PSH) dataset** (curated major cities/regions with winter & summer PSH + recommended tilt) shipped as a JSON table in the app, plus **manual override** for any location. No network fetch. (Note: a full world dataset is large; curated set + manual entry is the professional-pragmatic split.)
- **Component catalogs:** seeded SQLite (panels/inverters/batteries/cables) + user-editable.
- **All formulas** run as pure TS in the calculation engine — zero external calls.
- **Reports/exports** generated locally; sharing uses `expo-sharing` (device file/chooser, not the internet).

---

## 5. Architecture & Project Structure

```
SlorCalcPro/
├─ app/                      # expo-router screens
│  ├─ _layout.tsx            # Root (providers, theme, SQLite init)
│  ├─ (tabs)/                # Home/Projects, Catalog, Reports, Settings
│  ├─ project/
│  │  ├─ new.tsx             # Design wizard: load audit → location → system type → results
│  │  ├─ [id].tsx            # Project detail & scenarios
│  │  └─ results.tsx         # Recommendations + SLD + compliance + export
├─ src/
│  ├─ core/                  # PURE TS engine — no React/RN imports (unit-testable)
│  │  ├─ formulas/           # load, pv, battery, inverter, controller,
│  │  │                      #   voltage, seriesParallel, cable, protection
│  │  ├─ standards/          # nec.ts, iec.ts (compliance rules)
│  │  ├─ engine.ts           # Orchestrator: Input → DesignResult
│  │  ├─ audit.ts            # Step-by-step formula trace (show your work)
│  │  └─ types.ts            # Domain models (Immutable-ish)
│  ├─ db/
│  │  ├─ schema.ts, migrate.ts, seed.ts
│  │  └─ repos/              # panels, inverters, batteries, cables, projects
│  ├─ data/                  # seed JSON: panels.json, inverters.json,
│  │                         #   batteries.json, cables.json, psh.json, presets.json
│  ├─ store/                 # zustand slices: project, settings, catalog
│  ├─ components/            # Paper-based: NumberField, ApplianceRow, ResultCard,
│  │                         #   SldView (react-native-svg), WarningsList, WizardStepper
│  ├─ reports/               # pdfTemplate.ts, csvBuilder.ts, jsonIO.ts
│  ├─ theme/                 # light/dark Material theme, spacing, typography
│  └─ utils/                 # units (AWG↔mm²), formatting, validators
├─ plugins/                  # withNoInternetPermission, etc.
├─ eas.json, app.json, package.json, tsconfig.json, .eslintrc, .prettierrc
```

**Rule from the study:** everything except thin UI glue is pure TypeScript; any native-code deviation must be justified and approved first.

---

## 6. Calculation Engine Specification (all from the study)

| Module | Core formula(s) | Key outputs |
|---|---|---|
| **Daily load** | `Wh/day = Σ(P × h)`; AC → `÷ inverter η` (default 90%) | Energy/day (AC + DC), load profile table |
| **PV sizing** | `ArrayW = Energy ÷ winterPSH ÷ 0.75` (loss factor) | Required array power |
| **System voltage** | Table: <1 kW→12 V, 1–3 kW→24 V, >3 kW→48 V | 12/24/48 V recommendation (+ user override) |
| **Battery** | `kWh = Energy×Autonomy ÷ DoD`; `Ah = (Wh×Autonomy)÷(V×DoD)` | Capacity, series/parallel bank, quantity; DoD by chemistry (LiFePO₄ 80%, flooded 50%, AGM/Gel 60%) |
| **Inverter** | `Rated ≥ simultaneous load`; surge 3–7× motors | Continuous + surge rating, type (decision tree: grid? outage? → on/hybrid/off), voltage match |
| **Charge controller** | `Rating ≥ Isc×1.25`; max V input > Voc(worst-cold); PWM ~79% vs MPPT ~94% (>200 W → MPPT) | Controller type + rating |
| **Series/parallel** | `Nser ≤ MPPTmaxV ÷ Voc`; `Npar ≤ MPPTmaxI ÷ Isc`; `P=V×I` | String config, total power |
| **Cable sizing** | `A = (2·L·I·ρ)/ΔV` (ρ_Cu=0.0172), ΔV 1–2% DC src / 1–3% DC out / 3% AC; rooftop temp derating 40–50% | mm²/AWG, voltage drop %, ampacity check |
| **Protection** | DC OCPD = Isc×1.56; AC brkr = Iout×1.25; 120% backfeed rule; SPD type 1/2; ATS <20 ms | Fuses/breakers/SPD/ATS/isolators with standard sizes & voltage class (600/1000/1500 V) |

**Compliance checks (standards/):** NEC 690, NEC 706, IEC 62548 — output a checklist + warnings for violations (e.g., MPPT overvoltage, backfeed rule, series-fuse limit, inverter/battery voltage mismatch).

**Golden-test validation:** each module gets unit tests with known engineering values (hand-computed fixtures), plus an end-to-end engine test that reproduces a complete worked design from the study's inputs.

---

## 7. Data Layer & Seed Datasets

- **Tables:** `projects`, `scenarios`, `loads`, `components` (panels/inverters/batteries/cables with standard params per study §3.1 & §4.6), `settings`, `priceOverrides` (deferred), `psh`.
- **Seeds:** curated real dataset ~40–60 panels, ~20–30 inverters, ~15–25 batteries, full AWG↔mm²/ampacity reference table, PSH city table, appliance presets (AC, fridge, pump, lights…).
- All user additions/edits/duplicates stored locally. Migrations via incremental versioned schema.

---

## 8. Feature Breakdown by Screen

- **Home / Projects:** project cards, create/duplicate/rename/delete, JSON backup & restore (essential for installers — not in the study).
- **Design Wizard (new project):**
  1. **Load audit** — appliance list (name, Qty, W, h/day), presets, simultaneous-load flag, inverter η; edit/reorder.
  2. **Location & solar** — pick bundled city → PSH, or manual entry; winter & summer PSH; optional temp + tilt.
  3. **System type** — on-grid / off-grid / hybrid decision tree with guidance; autonomy days; chemistry; voltage.
  4. **Component selection** — auto-suggest vs manual pick from catalog (panels/inverter/battery/controller/cables).
- **Results:** recommended components + quantities, series/parallel scheme, full electrical specs (currents, cable sizes, protection ratings), **warnings list**, **calculation audit trail** (step-by-step with values).
- **Scenario comparison** (extra): compare 12/24/48 V, or on-grid vs hybrid vs off-grid for the same load — professional differentiator.
- **SLD viewer:** react-native-svg single-line diagram (PV→combiner→controller→battery→inverter→ATS→grid/loads with breakers/fuses/SPD/isolators).
- **Catalog:** searchable flash-list of panels/inverters/batteries/cables; add/edit/delete; favorites.
- **Reports:** PDF design summary (logo, inputs, results, SLD, BOM), BOM CSV, project JSON export/import.
- **Reference (extra):** offline formula & standards reference for installers.
- **Settings:** units (W/kW, AWG↔mm², m/ft), defaults (inverter η, loss factor, PSH), theme, wizard vs expert mode.

---

## 9. Essential Features Missing From the Study (added)

1. **Project management + multiple scenarios per project** — installers manage many sites; the study implies but never specifies persistence.
2. **Engineering validation/warnings** — series-fuse check, MPPT max-V vs worst-cold Voc, array/inverter ratio, battery c-rate, backfeed 120% rule. Study mentions compliance but not runtime guard-rails.
3. **Calculation audit trail** — show-the-work output so professionals can verify and quote designs credibly.
4. **Editable component library + favorites** — shipped data goes stale; users must add their own hardware.
5. **JSON backup/restore** — data safety for fully-offline local data.
6. **Wizard vs Expert mode** — guided onboarding for end users, full control for pros.
7. **Offline PSH dataset + manual override** — the study's "GPS" fetch is impossible fully-offline; this is the compliant substitute.
8. **Unit-system toggle & scenario comparison** — pragmatic pro tools.

*(Cost estimation explicitly deferred to v1 per your decision — schema leaves room for `priceOverrides`.)*

---

## 10. Quality Gates (per study)

`npx tsc --noEmit` before every commit · `npx expo-doctor` · ESLint (`eslint-config-expo`) · Prettier · `jest-expo` unit tests for the engine and DB repos · lint-staged (optional).

---

## 11. EAS Build & Release Pipeline

- `eas.json`: **development** (internal APK), **preview**, **production** (AAB, `release` build, API 36, versionCode managed).
- `eas project:init` with the existing project id/slug/owner; `eas build --profile production --platform android` → upload AAB to Play Console (internal testing → production).
- Keystore via EAS credentials + Play App Signing.

---

## 12. Milestones

| Phase | Deliverable | Est. |
|---|---|---|
| **P0** Scaffold | Expo SDK 57 + TS strict + eslint/prettier + expo-router tabs + Paper theme + eas.json + plugin stripping INTERNET | 0.5 wk |
| **P1** Engine | Pure-TS modules + compliance + audit trail + **golden tests** (all formulas) | 1.5 wks |
| **P2** Data | SQLite schema/migrations + seeds (catalog, PSH, presets) + repos + unit tests | 1 wk |
| **P3** Wizard UI | Projects, load audit, location, system type, component selection, results + warnings | 2 wks |
| **P4** Viz & Reports | SLD (SVG), PDF summary, BOM CSV, JSON backup/restore, scenario compare | 1.5 wks |
| **P5** Settings & polish | Units, defaults, dark mode, wizard/expert, haptics, reference docs | 1 wk |
| **P6** QA & Ship | expo-doctor, full test pass, EAS production AAB, Play Console checklist (privacy policy, Data Safety, screenshots, content rating) | 1 wk |

**Total ~8.5 weeks** to Play submission.

---

## 13. Risks & Mitigations

- **SDK 57 (1 month old):** pin SDK 56 as fallback — both target API 36.
- **Data accuracy of seed catalogs:** flagged as "reference — verify against manufacturer datasheet" + fully editable.
- **API-36 large-screen/edge-to-edge rules:** no locked orientation, adaptive layout from day one.
- **PSH dataset scale:** curated + manual override rather than full world dataset.
- **expo-print HTML→PDF rendering nuances:** test PDF layout early (Phase 4) with real fonts/units.
