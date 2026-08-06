/**
 * Core domain types for the SlorCalcPro calculation engine.
 * Pure TypeScript — no React Native / UI imports (platform-agnostic).
 */

export type SystemType = 'on-grid' | 'off-grid' | 'hybrid';

export type BatteryChemistry = 'lifepo4' | 'flooded' | 'agm-gel';

export type SystemVoltage = 12 | 24 | 48;

export type ControllerType = 'MPPT' | 'PWM';

/** A single appliance entry in the load audit. */
export interface LoadItem {
  id: string;
  name: string;
  quantity: number;
  /** Rated power in watts. */
  powerWatts: number;
  /** Daily usage hours. */
  hoursPerDay: number;
  /** AC load (served through the inverter) or DC load. */
  isAc: boolean;
  /** Counts toward the peak simultaneous load (inverter sizing). */
  isSimultaneous: boolean;
  /** Motor/inductive load; draws surge current at startup (3–7x rated). */
  isInductive: boolean;
  /** Startup surge multiplier (default 5 for motors, 1 otherwise). */
  surgeFactor?: number;
}

/** PV module parameters (component database entry). */
export interface PanelSpec {
  id: string;
  brand: string;
  model: string;
  /** Peak power at STC. */
  pmaxW: number;
  /** Open circuit voltage at STC. */
  vocV: number;
  /** Maximum power point voltage. */
  vmpV: number;
  /** Short circuit current. */
  iscA: number;
  /** Maximum power point current. */
  impA: number;
  /** Temperature coefficient for Pmax (%/°C, negative). */
  tempCoeffPmax: number;
  /** Temperature coefficient for Voc (%/°C, negative). */
  tempCoeffVoc: number;
  /** Maximum series fuse rating (A). */
  maxSeriesFuseRating: number;
  /** Maximum system voltage (V). */
  maxSystemVoltage: number;
  /** Width × height × depth in mm. */
  dimensionsMm?: { width: number; height: number; depth?: number };
  weightKg?: number;
}

/** Inverter parameters (component database entry). */
export interface InverterSpec {
  id: string;
  brand: string;
  model: string;
  /** System types this inverter supports. */
  supportedTypes: SystemType[];
  /** Continuous rated output power (W). */
  continuousPowerW: number;
  /** Peak/surge power (W). */
  surgePowerW: number;
  /** Battery input voltage (12/24/48) — off-grid/hybrid. */
  batteryVoltageV: SystemVoltage | null;
  /** Maximum PV input voltage (V) at the MPPT. */
  maxPvVoltageV: number;
  /** MPPT operating window (V). */
  mpptVoltageRangeMinV: number;
  mpptVoltageRangeMaxV: number;
  /** Maximum PV input current per MPPT (A). */
  maxPvCurrentA: number;
  /** Number of MPPT trackers. */
  mpptCount: number;
  /** Maximum continuous AC output current (A). */
  maxAcOutputCurrentA: number;
  /** Efficiency (0–1). */
  efficiency: number;
}

/** Battery parameters (component database entry). */
export interface BatterySpec {
  id: string;
  brand: string;
  model: string;
  chemistry: BatteryChemistry;
  nominalVoltageV: number;
  capacityAh: number;
  /** Max charge current (A). */
  maxChargeCurrentA: number;
  /** Max discharge current (A). */
  maxDischargeCurrentA: number;
  /** Recommended depth of discharge (0–1). */
  recommendedDoD: number;
  cycles?: number;
}

/** Charge controller parameters (component database entry). */
export interface ChargeControllerSpec {
  id: string;
  brand: string;
  model: string;
  type: ControllerType;
  ratedCurrentA: number;
  maxPvVoltageV: number;
  systemVoltageV: SystemVoltage;
  efficiency: number;
}

/** Conductor entry from the AWG ↔ mm² / ampacity reference table. */
export interface CableSpec {
  id: string;
  crossSectionMm2: number;
  /** AWG label, e.g. "10 AWG", "4/0 AWG", or null for metric-only. */
  awg: string | null;
  /** Base ampacity (A) for copper, 75°C insulation. */
  ampacityA: number;
  /** DC resistance (Ω/km) at 20°C. */
  resistancePerKm: number;
}

/** Full set of inputs to the design engine. */
export interface SystemInput {
  loads: LoadItem[];
  systemType: SystemType;
  /** Winter peak sun hours (kWh/m²/day). */
  winterPsh: number;
  /** Summer peak sun hours (kWh/m²/day). */
  summerPsh: number;
  /** Days of autonomy (battery backup). */
  autonomyDays: number;
  chemistry: BatteryChemistry;
  /** Explicit system voltage; undefined → auto-recommended. */
  systemVoltageOverride?: SystemVoltage;
  /** Inverter efficiency (0–1), default 0.90. */
  inverterEfficiency?: number;
  /** Total system loss factor (0–1), default 0.75. */
  systemLossFactor?: number;
  /** DC source circuit voltage-drop limit (%), default 2. */
  dcVoltageDropPercent?: number;
  /** AC circuit voltage-drop limit (%), default 3. */
  acVoltageDropPercent?: number;
  /** Expected lowest ambient temperature (°C) for Voc derating, default −10. */
  minTemperatureC?: number;
  /** Rooftop cable temperature derating factor (0–1), default 0.6. */
  tempDeratingFactor?: number;
  /** One-way PV source cable length (m), default 10. */
  pvCableLengthM?: number;
  /** One-way DC output (battery↔inverter) cable length (m), default 2. */
  dcCableLengthM?: number;
  /** One-way AC output cable length (m), default 10. */
  acCableLengthM?: number;
  /** Main panel busbar rating for the 120% backfeed rule (A), default 200. */
  busbarRatingA?: number;
  /** Main breaker rating (A), default 200. */
  mainBreakerA?: number;
  /** Selected components (auto-suggested if absent). */
  selected?: {
    panel?: PanelSpec;
    inverter?: InverterSpec;
    battery?: BatterySpec;
    controller?: ChargeControllerSpec;
  };
}

export type Severity = 'info' | 'warning' | 'error';

export interface Warning {
  code: string;
  severity: Severity;
  message: string;
  /** Referenced standard, e.g. "NEC 690.8". */
  standard?: string;
}

export interface AuditStep {
  id: string;
  description: string;
  formula: string;
  values: Record<string, number | string>;
  result: number | string;
  unit?: string;
}

export interface DailyLoadResult {
  totalWhPerDay: number;
  acWhPerDay: number;
  dcWhPerDay: number;
  /** AC energy converted to DC-equivalent at the inverter input. */
  dcEquivalentWhPerDay: number;
  peakSimultaneousWatts: number;
  peakSurgeWatts: number;
}

export interface PvResult {
  requiredArrayWatts: number;
  totalPanelCount: number;
  seriesCount: number;
  parallelCount: number;
  actualArrayWatts: number;
  arrayVocV: number;
  arrayVmpV: number;
  arrayIscA: number;
  arrayImpA: number;
  /** Whether the string configuration fits within MPPT limits. */
  fitsInverterLimits: boolean;
}

export interface BatteryResult {
  systemVoltageV: SystemVoltage;
  requiredKwh: number;
  requiredAhAtSystemVoltage: number;
  seriesCount: number;
  parallelCount: number;
  batteryCount: number;
  actualCapacityAh: number;
  actualCapacityKwh: number;
  depthOfDischarge: number;
}

export interface InverterResult {
  recommendedType: SystemType;
  recommendedContinuousWatts: number;
  recommendedSurgeWatts: number;
  recommendedBatteryVoltageV: SystemVoltage | null;
  selectedContinuousWatts: number | null;
  voltageMatch: boolean;
}

export interface ControllerResult {
  recommendedType: ControllerType;
  minCurrentA: number;
  maxPvVoltageRequiredV: number;
  selectedCurrentA: number | null;
  selectedMaxPvVoltageV: number | null;
}

export interface CableSelection {
  crossSectionMm2: number;
  awg: string | null;
  currentA: number;
  voltageDropPercent: number;
  ampacityA: number;
  ampacityPasses: boolean;
}

export interface CableResult {
  pvSource: CableSelection;
  dcOutput: CableSelection;
  acOutput: CableSelection;
}

export interface ProtectionResult {
  pvSourceOcpdA: number;
  pvSourceOcpdStandardA: number;
  acBreakerA: number;
  acBreakerStandardA: number;
  backfeedPasses: boolean;
  backfeedMarginPct: number;
  dcIsolatorRequired: boolean;
  acIsolatorRequired: boolean;
  atsRequired: boolean;
  spdType: 'Type 1' | 'Type 2' | 'none';
}

export interface ComplianceResult {
  arrayVocColdV: number;
  arrayVocWithinInverterLimit: boolean;
  controllerCurrentWithinLimit: boolean;
  pvOcpdWithinSeriesFuse: boolean;
  inverterPowerSufficient: boolean;
  batteryVoltageMatchesInverter: boolean;
  checks: Warning[];
}

export interface DesignResult {
  input: SystemInput;
  dailyLoad: DailyLoadResult;
  pv: PvResult;
  battery: BatteryResult;
  inverter: InverterResult;
  controller: ControllerResult;
  cables: CableResult;
  protection: ProtectionResult;
  compliance: ComplianceResult;
  warnings: Warning[];
  audit: AuditStep[];
}
