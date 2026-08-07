import type { ScenarioRecord } from '../db/repos/projects';

export interface ComparisonRow {
  metric: string;
  values: (string | number)[];
}

const fmt = (n: number | undefined | null): string | number =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : Math.round(n * 10) / 10;

function extract(scenario: ScenarioRecord): Record<string, string | number> {
  const r = scenario.designResult;
  if (!r) return {};
  const { dailyLoad, pv, battery, inverter, controller, cables, protection } = r;
  return {
    'Daily energy': fmt(dailyLoad.totalWhPerDay),
    'Peak load (W)': fmt(dailyLoad.peakSimultaneousWatts),
    'PV array (W)': fmt(pv.actualArrayWatts),
    'PV config': `${pv.seriesCount}S × ${pv.parallelCount}P`,
    'Battery (Ah)': fmt(battery.actualCapacityAh),
    'Battery cells': battery.batteryCount,
    'Inverter (W)': fmt(inverter.selectedContinuousWatts ?? inverter.recommendedContinuousWatts),
    'Controller (A)': controller.selectedCurrentA ?? controller.minCurrentA,
    'PV cable (mm²)': cables.pvSource.crossSectionMm2,
    'AC cable (mm²)': cables.acOutput.crossSectionMm2,
    'PV OCPD (A)': protection.pvSourceOcpdStandardA,
    'AC breaker (A)': protection.acBreakerStandardA,
    Checks: r.warnings.filter((w) => w.severity === 'error').length,
  };
}

/** Compare the key sizing metrics across scenarios that have a design result. */
export function compareScenarios(scenarios: ScenarioRecord[]): {
  rows: ComparisonRow[];
  columns: ScenarioRecord[];
} {
  const columns = scenarios.filter((s) => s.designResult);
  if (columns.length === 0) return { rows: [], columns };
  const extracted = columns.map(extract);
  const metricNames = Array.from(new Set(extracted.flatMap((e) => Object.keys(e))));
  const rows: ComparisonRow[] = metricNames.map((metric) => ({
    metric,
    values: extracted.map((e) => e[metric] ?? '—'),
  }));
  return { rows, columns };
}
