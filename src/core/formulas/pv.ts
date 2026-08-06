import type { AuditTrail } from '../audit';
import type { PvResult, PanelSpec } from '../types';
import { round } from '../data/cableTable';

export const DEFAULT_SYSTEM_LOSS_FACTOR = 0.75;

export interface StringConstraints {
  maxVoltageV: number;
  mpptMinVoltageV: number;
  mpptMaxVoltageV: number;
  maxCurrentA: number;
}

export interface RecommendedString {
  seriesCount: number;
  parallelCount: number;
  totalPanelCount: number;
  actualArrayWatts: number;
  arrayVocV: number;
  arrayVmpV: number;
  arrayIscA: number;
  arrayImpA: number;
  fitsInverterLimits: boolean;
}

/**
 * PV array sizing (study §2.2):
 *   Array Power (W) = Daily Energy (Wh) ÷ Winter PSH ÷ system loss factor
 */
export function requiredArrayWatts(
  dcEquivalentWhPerDay: number,
  winterPsh: number,
  lossFactor: number,
  audit: AuditTrail,
): number {
  if (winterPsh <= 0) {
    throw new Error('Winter peak sun hours must be greater than 0.');
  }
  const required = dcEquivalentWhPerDay / winterPsh / lossFactor;
  audit.add({
    id: 'pv.required',
    description: 'Required PV array power',
    formula: 'DC_Wh ÷ winterPSH ÷ lossFactor',
    values: { dcEquivalentWhPerDay, winterPsh, lossFactor },
    result: round(required),
    unit: 'W',
  });
  return required;
}

/**
 * Series/parallel string configuration (study §3.2):
 *   N_series_max = MPPT Max Voltage ÷ Panel Voc
 *   N_parallel_max = MPPT Max Current ÷ Panel Isc
 * The configuration with the least over-production is chosen, favouring
 * higher string voltage (lower current → reduced cable losses).
 */
export function recommendStringConfiguration(
  requiredWatts: number,
  panel: PanelSpec,
  constraints: StringConstraints,
  audit: AuditTrail,
): RecommendedString {
  const maxSystemV = Math.min(constraints.maxVoltageV, panel.maxSystemVoltage);
  const nSeriesMax = Math.floor(maxSystemV / panel.vocV);
  const nSeriesMin =
    constraints.mpptMinVoltageV > 0 ? Math.ceil(constraints.mpptMinVoltageV / panel.vmpV) : 1;
  const nParallelMax =
    constraints.maxCurrentA > 0 ? Math.floor(constraints.maxCurrentA / panel.iscA) : 1000;

  const targetPanels = Math.ceil(requiredWatts / panel.pmaxW);

  let best: { series: number; parallel: number; actual: number } | null = null;

  for (let parallel = 1; parallel <= nParallelMax; parallel++) {
    const series = Math.ceil(targetPanels / parallel);
    if (series < nSeriesMin || series > nSeriesMax) {
      continue;
    }
    const actual = series * parallel;
    const overage = actual - targetPanels;
    if (
      !best ||
      overage < best.actual - targetPanels ||
      (overage === best.actual - targetPanels && series > best.series)
    ) {
      best = { series, parallel, actual };
    }
  }

  if (!best) {
    const series = Math.max(1, nSeriesMin);
    const parallel = Math.ceil(targetPanels / series);
    best = { series, parallel, actual: series * parallel };
  }

  const result: RecommendedString = {
    seriesCount: best.series,
    parallelCount: best.parallel,
    totalPanelCount: best.actual,
    actualArrayWatts: best.actual * panel.pmaxW,
    arrayVocV: best.series * panel.vocV,
    arrayVmpV: best.series * panel.vmpV,
    arrayIscA: best.parallel * panel.iscA,
    arrayImpA: best.parallel * panel.impA,
    fitsInverterLimits:
      best.actual === best.series * best.parallel &&
      best.series <= nSeriesMax &&
      best.series >= nSeriesMin &&
      best.parallel <= nParallelMax,
  };

  audit.add({
    id: 'pv.string',
    description: 'Series/parallel configuration',
    formula: 'N_series ≤ MPPT_maxV ÷ Voc · N_parallel ≤ MPPT_maxI ÷ Isc',
    values: {
      targetPanels,
      maxSystemV: round(maxSystemV),
      nSeriesMax,
      nSeriesMin,
      nParallelMax,
    },
    result: `${best.series}S × ${best.parallel}P = ${best.actual} panels`,
  });

  audit.add({
    id: 'pv.arraySpecs',
    description: 'Array electrical characteristics',
    formula: 'V = series × panel V · I = parallel × panel I · P = V × I',
    values: {
      arrayVocV: round(result.arrayVocV),
      arrayVmpV: round(result.arrayVmpV),
      arrayIscA: round(result.arrayIscA),
      arrayImpA: round(result.arrayImpA),
    },
    result: round(result.actualArrayWatts),
    unit: 'W',
  });

  return result;
}

/**
 * Full PV array result with configuration.
 * `constraints` are taken from the MPPT (grid-tie inverter) or charge
 * controller (off-grid), or defaults when neither is available.
 */
export function calculatePvArray(
  dcEquivalentWhPerDay: number,
  winterPsh: number,
  lossFactor: number,
  panel: PanelSpec,
  constraints: StringConstraints,
  audit: AuditTrail,
): PvResult {
  const required = requiredArrayWatts(dcEquivalentWhPerDay, winterPsh, lossFactor, audit);
  const config = recommendStringConfiguration(required, panel, constraints, audit);

  return {
    requiredArrayWatts: required,
    ...config,
  };
}
