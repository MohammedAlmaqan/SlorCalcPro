import type { AuditTrail } from '../audit';
import type { ProtectionResult, SystemType } from '../types';
import { round } from '../data/cableTable';

/** Standard overcurrent protection device ratings (A). */
export const STANDARD_OCPD_SIZES = [
  1, 2, 3, 5, 6, 8, 10, 13, 15, 20, 25, 30, 32, 40, 50, 60, 63, 80, 100, 125, 160, 200, 250, 315,
  400, 500, 600, 800, 1000,
];

/** NEC 690.8: PV source circuit current = Isc × 1.56. */
export const PV_CURRENT_MULTIPLIER = 1.56;

export interface ProtectionInput {
  arrayIscA: number;
  inverterAcOutputCurrentA: number;
  mainBreakerA: number;
  busbarRatingA: number;
  systemType: SystemType;
  panelMaxSeriesFuseRating: number;
}

export function standardOcpd(minimumA: number): number {
  const match = STANDARD_OCPD_SIZES.find((size) => size >= minimumA);
  if (!match) {
    throw new Error(`Required OCPD rating (${minimumA.toFixed(1)} A) exceeds the standard range.`);
  }
  return match;
}

/**
 * Protection device sizing (study §4):
 *   PV source OCPD = Isc × 1.56, next standard size ≤ panel series fuse rating.
 *   AC breaker = inverter max output current × 1.25.
 *   Main + PV breaker ≤ 1.20 × busbar (120% rule).
 */
export function sizeProtection(input: ProtectionInput, audit: AuditTrail): ProtectionResult {
  const pvSourceOcpdA = input.arrayIscA * PV_CURRENT_MULTIPLIER;
  const pvSourceOcpdStandardA = standardOcpd(pvSourceOcpdA);

  const acBreakerA = input.inverterAcOutputCurrentA * 1.25;
  const acBreakerStandardA = standardOcpd(acBreakerA);

  const available = input.busbarRatingA * 1.2;
  const totalFeed = input.mainBreakerA + acBreakerStandardA;
  const backfeedPasses = totalFeed <= available;
  const backfeedMarginPct = ((available - totalFeed) / available) * 100;

  audit.add({
    id: 'protection.pvOcpd',
    description: 'PV source overcurrent protection',
    formula: 'Isc × 1.56 → next standard size',
    values: { arrayIscA: round(input.arrayIscA), multiplier: PV_CURRENT_MULTIPLIER },
    result: pvSourceOcpdStandardA,
    unit: 'A',
  });

  audit.add({
    id: 'protection.acBreaker',
    description: 'Inverter AC output breaker',
    formula: 'maxAcOutputCurrent × 1.25 → next standard size',
    values: { inverterAcOutputCurrentA: round(input.inverterAcOutputCurrentA) },
    result: acBreakerStandardA,
    unit: 'A',
  });

  audit.add({
    id: 'protection.backfeed',
    description: 'Main panel 120% backfeed rule',
    formula: 'main + PV ≤ 1.20 × busbar',
    values: {
      mainBreakerA: input.mainBreakerA,
      pvBreakerA: acBreakerStandardA,
      busbarRatingA: input.busbarRatingA,
      available: round(available),
    },
    result: backfeedPasses ? `PASS (${round(backfeedMarginPct)}% margin)` : 'FAIL',
  });

  const dcIsolatorRequired = true; // PV array isolation is always required.
  const acIsolatorRequired = input.systemType === 'on-grid' || input.systemType === 'hybrid';
  const atsRequired = input.systemType === 'hybrid';
  const spdType = input.systemType === 'off-grid' ? ('Type 2' as const) : ('Type 2' as const);

  return {
    pvSourceOcpdA,
    pvSourceOcpdStandardA,
    acBreakerA,
    acBreakerStandardA,
    backfeedPasses,
    backfeedMarginPct,
    dcIsolatorRequired,
    acIsolatorRequired,
    atsRequired,
    spdType,
  };
}
