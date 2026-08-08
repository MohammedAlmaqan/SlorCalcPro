import { PV_CURRENT_MULTIPLIER, STANDARD_OCPD_SIZES } from '../core/formulas/protection';
import type { ComponentRecord } from '../data/types';
import type {
  BatteryChemistry,
  ChargeControllerSpec,
  InverterSpec,
  PanelSpec,
  SystemType,
  SystemVoltage,
} from '../core/types';
import type { SpecByKind } from './repos/catalog';

/** Requirements a suggested component must satisfy (derived from the engine). */
export interface SuggestRequirements {
  requiredArrayWatts: number;
  recommendedContinuousWatts: number;
  recommendedSurgeWatts: number;
  systemVoltage: SystemVoltage;
  systemType: SystemType;
  chemistry: BatteryChemistry;
  requiredKwh: number;
  controllerMinCurrentA: number;
  controllerMaxPvVoltageRequiredV: number;
  /** MPPT string limits (voltage window + max current). */
  mpptMinVoltageV: number;
  mpptMaxVoltageV: number;
  maxInputVoltageV: number;
  /** Design ambient low temperature (°C) used for cold-Voc derating (default -10). */
  minTemperatureC?: number;
}

export interface Suggestion {
  panelId: string | null;
  inverterId: string | null;
  batteryId: string | null;
  controllerId: string | null;
}

/** Next standard OCPD size >= `minimumA`, or null if beyond the standard range. */
function nextStandardOcpd(minimumA: number): number | null {
  return STANDARD_OCPD_SIZES.find((size) => size >= minimumA) ?? null;
}
/**
 * Pick the best-fitting component for each slot from in-memory catalog lists.
 * Pure function — no I/O, no React imports (unit-testable).
 *
 * Strategies:
 * - Panel: minimize total panel count (series × parallel) while keeping the
 *   string voltage inside the MPPT window; tie-break by array overshoot.
 * - Inverter: smallest continuous rating that covers the load (surge-aware),
 *   matching battery voltage for battery-backed systems.
 * - Battery: fewest cells that meet the required kWh at the system voltage.
 * - Controller: smallest rating that covers current + max PV voltage.
 */
export function suggestComponents(
  requirements: SuggestRequirements,
  panels: ComponentRecord<PanelSpec>[],
  inverters: ComponentRecord<InverterSpec>[],
  batteries: ComponentRecord<SpecByKind['battery']>[],
  controllers: ComponentRecord<ChargeControllerSpec>[],
): Suggestion {
  const { systemType } = requirements;
  const isOffGrid = systemType === 'off-grid';
  const isOnGrid = systemType === 'on-grid';

  const panelFit = bestPanel(requirements, panels);
  const inverterFit = bestInverter(requirements, inverters);
  const batteryFit = isOnGrid ? null : bestBattery(requirements, batteries);
  const controllerFit = isOffGrid ? bestController(requirements, controllers) : null;

  return {
    panelId: panelFit?.record.id ?? null,
    inverterId: inverterFit?.id ?? null,
    batteryId: batteryFit?.id ?? null,
    controllerId: controllerFit?.id ?? null,
  };
}

function bestPanel(
  r: SuggestRequirements,
  candidates: ComponentRecord<PanelSpec>[],
): { record: ComponentRecord<PanelSpec>; totalCount: number; overshootWatts: number } | null {
  if (candidates.length === 0) return null;

  interface PanelCandidate {
    record: ComponentRecord<PanelSpec>;
    totalCount: number;
    overshootWatts: number;
    fusePasses: boolean;
  }

  const better = (a: PanelCandidate, b: PanelCandidate): boolean =>
    a.totalCount < b.totalCount ||
    (a.totalCount === b.totalCount && a.overshootWatts < b.overshootWatts);

  let bestPassing: PanelCandidate | null = null;
  let bestAny: PanelCandidate | null = null;

  for (const record of candidates) {
    const panel = record.spec;
    // NEC 690.7: Voc must be derated for the design low temperature
    // (module Voc temp coefficient is negative, so cold raises Voc).
    const tempDelta = (r.minTemperatureC ?? -10) - 25;
    const coldVoc = panel.vocV * (1 + (panel.tempCoeffVoc / 100) * tempDelta);
    const minSeries = Math.max(1, Math.ceil(r.mpptMinVoltageV / Math.max(1, panel.vmpV)));
    const maxSeries = Math.min(
      Math.floor(r.maxInputVoltageV / Math.max(1, coldVoc)),
      Math.floor(r.mpptMaxVoltageV / Math.max(1, panel.vmpV)),
    );
    if (minSeries > maxSeries) continue;

    for (let series = minSeries; series <= maxSeries; series += 1) {
      const parallel = Math.max(1, Math.ceil(r.requiredArrayWatts / (series * panel.pmaxW)));
      const totalCount = series * parallel;
      const actualWatts = totalCount * panel.pmaxW;
      const overshootWatts = Math.max(0, actualWatts - r.requiredArrayWatts);

      // NEC 690.9: the PV source OCPD (Isc × 1.56, next standard size) must not
      // exceed the panel maximum series fuse rating.
      const ocpd = nextStandardOcpd(parallel * panel.iscA * PV_CURRENT_MULTIPLIER);
      const fusePasses = ocpd !== null && ocpd <= panel.maxSeriesFuseRating;

      const candidate: PanelCandidate = { record, totalCount, overshootWatts, fusePasses };
      if (!bestAny || better(candidate, bestAny)) bestAny = candidate;
      if (fusePasses && (!bestPassing || better(candidate, bestPassing))) bestPassing = candidate;
    }
  }

  return bestPassing ?? bestAny;
}

function bestInverter(
  r: SuggestRequirements,
  candidates: ComponentRecord<InverterSpec>[],
): ComponentRecord<InverterSpec> | null {
  const compatible = candidates.filter((c) => c.spec.supportedTypes.includes(r.systemType));
  if (compatible.length === 0) return null;

  const voltageMatchPenalty = (spec: InverterSpec): number => {
    if (r.systemType === 'on-grid' || spec.batteryVoltageV === null) return 0;
    return spec.batteryVoltageV === r.systemVoltage ? 0 : 10_000;
  };
  const surgeOkPenalty = (spec: InverterSpec): number =>
    spec.surgePowerW >= r.recommendedSurgeWatts ? 0 : 100_000;

  const scored = compatible
    .map((record) => {
      const { continuousPowerW } = record.spec;
      const shortfall = Math.max(0, r.recommendedContinuousWatts - continuousPowerW);
      const score =
        voltageMatchPenalty(record.spec) +
        surgeOkPenalty(record.spec) +
        shortfall * 1_000 +
        continuousPowerW;
      return { record, score };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0].record;
}

function bestBattery(
  r: SuggestRequirements,
  candidates: ComponentRecord<SpecByKind['battery']>[],
): ComponentRecord<SpecByKind['battery']> | null {
  const compatible = candidates.filter(
    (c) => c.spec.chemistry === r.chemistry && c.spec.capacityAh > 0 && c.spec.nominalVoltageV > 0,
  );
  if (compatible.length === 0) return null;

  let best: {
    record: ComponentRecord<SpecByKind['battery']>;
    totalCount: number;
    overshootKwh: number;
  } | null = null;

  for (const record of compatible) {
    const { nominalVoltageV, capacityAh } = record.spec;
    const series = Math.max(1, Math.ceil(r.systemVoltage / nominalVoltageV));
    const parallel = Math.max(
      1,
      Math.ceil((r.requiredKwh * 1000) / (series * nominalVoltageV * capacityAh)),
    );
    const totalCount = series * parallel;
    const actualKwh = (series * parallel * nominalVoltageV * capacityAh) / 1000;
    const overshootKwh = Math.max(0, actualKwh - r.requiredKwh);

    const candidate = { record, totalCount, overshootKwh };
    if (!best) {
      best = candidate;
      continue;
    }
    if (
      candidate.totalCount < best.totalCount ||
      (candidate.totalCount === best.totalCount && candidate.overshootKwh < best.overshootKwh)
    ) {
      best = candidate;
    }
  }
  return best?.record ?? null;
}

function bestController(
  r: SuggestRequirements,
  candidates: ComponentRecord<ChargeControllerSpec>[],
): ComponentRecord<ChargeControllerSpec> | null {
  if (candidates.length === 0) return null;
  const needMppt = r.controllerMaxPvVoltageRequiredV > 0 || r.requiredArrayWatts > 200;
  const type = needMppt ? 'MPPT' : 'PWM';
  const compatible = candidates.filter(
    (c) =>
      c.spec.type === type &&
      c.spec.maxPvVoltageV >= r.controllerMaxPvVoltageRequiredV &&
      c.spec.ratedCurrentA >= r.controllerMinCurrentA,
  );
  if (compatible.length === 0) {
    const any = candidates.filter((c) => c.spec.type === type);
    if (any.length === 0) return null;
    return any.sort((a, b) => b.spec.ratedCurrentA - a.spec.ratedCurrentA)[0];
  }
  return compatible.sort((a, b) => a.spec.ratedCurrentA - b.spec.ratedCurrentA)[0];
}
