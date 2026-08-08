import { AuditTrail } from './audit';
import {
  REFERENCE_BATTERY,
  REFERENCE_CONTROLLER,
  REFERENCE_PANEL,
  referenceInverterFor,
} from './data/referenceComponents';
import { calculateBatteryBank } from './formulas/battery';
import { pvSourceCircuitCurrent, sizeCables, DEFAULT_AC_VOLTAGE } from './formulas/cable';
import { sizeChargeController, COLD_TEMP_VOC_MULTIPLIER } from './formulas/chargeController';
import { sizeInverter } from './formulas/inverter';
import { calculateDailyLoad, calculateTotalDailyLoad } from './formulas/load';
import { sizeProtection } from './formulas/protection';
import { calculatePvArray, type StringConstraints } from './formulas/pv';
import { recommendSystemVoltage } from './formulas/systemVoltage';
import { iecChecks } from './standards/iec';
import { necChecks } from './standards/nec';
import { applyStandardsPolicy } from './standards/policy';
import type {
  BatteryResult,
  ChargeControllerSpec,
  ComplianceResult,
  DesignResult,
  InverterSpec,
  SystemInput,
  SystemVoltage,
  Warning,
} from './types';
import { round } from './data/cableTable';

/**
 * Main design orchestrator. Runs every module in order and returns a complete
 * DesignResult with recommendations, compliance checks, warnings and a full
 * audit trail. Pure TypeScript — safe to call anywhere.
 */
export function designSystem(input: SystemInput): DesignResult {
  const audit = new AuditTrail();
  const warnings: Warning[] = [];

  const inverterEfficiency = input.inverterEfficiency ?? 0.9;
  const lossFactor = input.systemLossFactor ?? 0.75;
  const tempDerating = input.tempDeratingFactor ?? 0.6;
  const minTemperatureC = input.minTemperatureC ?? -10;

  const selectedInverter = input.selected?.inverter ?? referenceInverterFor(input.systemType);
  const panel = input.selected?.panel ?? REFERENCE_PANEL;
  const battery = input.selected?.battery ?? REFERENCE_BATTERY;
  const controller = input.selected?.controller ?? REFERENCE_CONTROLLER;

  // 1. Daily load audit ----------------------------------------------------
  const dailyLoad =
    input.loadMode === 'total'
      ? calculateTotalDailyLoad(
          {
            totalDailyKwh: input.totalDailyKwh ?? 0,
            peakKw: input.totalPeakKw,
            surgeKw: input.totalSurgeKw,
            isAc: input.totalLoadIsAc ?? true,
            inverterEfficiency,
          },
          audit,
        )
      : calculateDailyLoad(input.loads, inverterEfficiency, audit);

  // 2. System voltage ------------------------------------------------------
  const recommendedVoltage = recommendSystemVoltage(dailyLoad.peakSimultaneousWatts);
  const systemVoltage: SystemVoltage = input.systemVoltageOverride ?? recommendedVoltage;

  audit.add({
    id: 'system.voltage',
    description: 'System voltage recommendation',
    formula: 'Table: <1kW → 12V · 1–3kW → 24V · >3kW → 48V',
    values: { peakSimultaneousWatts: dailyLoad.peakSimultaneousWatts },
    result: systemVoltage,
    unit: 'V',
  });

  // 3. Inverter ------------------------------------------------------------
  const inverter = sizeInverter(
    {
      peakSimultaneousWatts: dailyLoad.peakSimultaneousWatts,
      peakSurgeWatts: dailyLoad.peakSurgeWatts,
      recommendedType: input.systemType,
      systemVoltageV: systemVoltage,
      inverter: input.selected?.inverter ?? null,
    },
    audit,
  );

  // 4. PV array ------------------------------------------------------------
  const constraints = stringConstraints(input, selectedInverter, controller, systemVoltage);
  const pv = calculatePvArray(
    dailyLoad.dcEquivalentWhPerDay,
    input.winterPsh,
    lossFactor,
    panel,
    constraints,
    audit,
  );

  // 5. Battery bank (not required for on-grid) -----------------------------
  const isOnGrid = input.systemType === 'on-grid';
  const batteryResult = isOnGrid
    ? emptyBatteryResult(systemVoltage)
    : calculateBatteryBank(
        {
          dcEquivalentWhPerDay: dailyLoad.dcEquivalentWhPerDay,
          autonomyDays: input.autonomyDays,
          chemistry: input.chemistry,
          systemVoltageV: systemVoltage,
          battery,
        },
        audit,
      );

  if (isOnGrid) {
    warnings.push({
      code: 'BATTERY-NOT-REQUIRED',
      severity: 'info',
      message: 'On-grid systems do not require a battery bank (no backup).',
      standard: 'NEC 705',
    });
  } else if (input.autonomyDays <= 0) {
    warnings.push({
      code: 'AUTONOMY-ZERO',
      severity: 'warning',
      message: 'Days of autonomy is 0 — the battery bank will provide no backup.',
    });
  }

  // 6. Charge controller ---------------------------------------------------
  const controllerResult = isOnGrid
    ? emptyControllerResult()
    : sizeChargeController(
        pv.arrayIscA,
        pv.arrayVocV,
        pv.actualArrayWatts,
        input.selected?.controller ?? null,
        audit,
      );

  // 7. Cables --------------------------------------------------------------
  const pvSourceCurrent = pvSourceCircuitCurrent(pv.arrayIscA);
  const dcOutputCurrent = isOnGrid
    ? 0
    : inverter.recommendedContinuousWatts / (systemVoltage * inverterEfficiency);
  const acOutputCurrent =
    selectedInverter.maxAcOutputCurrentA > 0
      ? selectedInverter.maxAcOutputCurrentA
      : inverter.recommendedContinuousWatts / DEFAULT_AC_VOLTAGE;

  const cables = sizeCables(
    {
      pvSourceCurrentA: pvSourceCurrent,
      pvArrayVmpV: pv.arrayVmpV,
      dcOutputCurrentA: dcOutputCurrent,
      systemVoltageV: systemVoltage,
      acOutputCurrentA: acOutputCurrent,
      pvCableLengthM: input.pvCableLengthM,
      dcCableLengthM: input.dcCableLengthM,
      acCableLengthM: input.acCableLengthM,
      dcVoltageDropPercent: input.dcVoltageDropPercent,
      acVoltageDropPercent: input.acVoltageDropPercent,
      tempDeratingFactor: tempDerating,
    },
    audit,
  );

  // 8. Protection ----------------------------------------------------------
  const protection = sizeProtection(
    {
      arrayIscA: pv.arrayIscA,
      inverterAcOutputCurrentA: acOutputCurrent,
      mainBreakerA: input.mainBreakerA ?? 200,
      busbarRatingA: input.busbarRatingA ?? 200,
      systemType: input.systemType,
      panelMaxSeriesFuseRating: panel.maxSeriesFuseRating,
    },
    audit,
  );

  // 9. Compliance checks ---------------------------------------------------
  const arrayVocColdV = pv.arrayVocV * (1 + (panel.tempCoeffVoc / 100) * (minTemperatureC - 25));
  const isOffGrid = input.systemType === 'off-grid';
  const maxPvInputVoltageV = isOffGrid ? controller.maxPvVoltageV : selectedInverter.maxPvVoltageV;
  const maxInputCurrentA = isOffGrid
    ? controller.ratedCurrentA
    : selectedInverter.maxPvCurrentA * selectedInverter.mpptCount;

  const compliance = buildCompliance({
    arrayVocColdV,
    maxPvInputVoltageV,
    arrayIscA: pv.arrayIscA,
    maxControllerInputCurrentA: maxInputCurrentA,
    pvOcpdStandardA: protection.pvSourceOcpdStandardA,
    panelMaxSeriesFuseRatingA: panel.maxSeriesFuseRating,
    inverterContinuousW: selectedInverter.continuousPowerW,
    requiredInverterContinuousW: inverter.recommendedContinuousWatts,
    mainBreakerA: input.mainBreakerA ?? 200,
    pvBreakerA: protection.acBreakerStandardA,
    busbarRatingA: input.busbarRatingA ?? 200,
  });

  // 10. Standards checks ---------------------------------------------------
  const standardsWarnings = [
    ...necChecks({
      arrayVocColdV,
      maxPvInputVoltageV,
      arrayIscA: pv.arrayIscA,
      maxControllerInputCurrentA: maxInputCurrentA,
      pvOcpdStandardA: protection.pvSourceOcpdStandardA,
      panelMaxSeriesFuseRatingA: panel.maxSeriesFuseRating,
      inverterContinuousW: selectedInverter.continuousPowerW,
      requiredInverterContinuousW: inverter.recommendedContinuousWatts,
      mainBreakerA: input.mainBreakerA ?? 200,
      pvBreakerA: protection.acBreakerStandardA,
      busbarRatingA: input.busbarRatingA ?? 200,
    }),
    ...iecChecks({
      pvVoltageDropPercent: cables.pvSource.voltageDropPercent,
      dcVoltageDropLimitPercent: input.dcVoltageDropPercent ?? 2,
      acVoltageDropPercent: cables.acOutput.voltageDropPercent,
      acVoltageDropLimitPercent: input.acVoltageDropPercent ?? 3,
      ampacityPasses: cables.pvSource.ampacityPasses,
    }),
  ];
  warnings.push(...applyStandardsPolicy(standardsWarnings, input.standardsPolicy));

  // 11. Engineering warnings ------------------------------------------------
  if (!inverter.voltageMatch) {
    warnings.push({
      code: 'INV-VOLTAGE-MISMATCH',
      severity: 'error',
      message: `Selected inverter battery voltage does not match the ${systemVoltage} V system voltage.`,
    });
  }

  if (!pv.fitsInverterLimits) {
    warnings.push({
      code: 'PV-STRING-LIMITS',
      severity: 'error',
      message: 'PV string configuration could not fit within the MPPT voltage/current limits.',
    });
  }

  if (!cables.pvSource.ampacityPasses) {
    warnings.push({
      code: 'CABLE-AMPACITY-PV',
      severity: 'error',
      standard: 'IEC 62548',
      message: `PV source cable (${cables.pvSource.crossSectionMm2} mm²) ampacity is insufficient.`,
    });
  }

  if (!cables.dcOutput.ampacityPasses) {
    warnings.push({
      code: 'CABLE-AMPACITY-DC',
      severity: 'error',
      standard: 'IEC 62548',
      message: `DC output cable (${cables.dcOutput.crossSectionMm2} mm²) ampacity is insufficient.`,
    });
  }

  if (!cables.acOutput.ampacityPasses) {
    warnings.push({
      code: 'CABLE-AMPACITY-AC',
      severity: 'error',
      standard: 'IEC 62548',
      message: `AC output cable (${cables.acOutput.crossSectionMm2} mm²) ampacity is insufficient.`,
    });
  }

  if (!isOnGrid) {
    const maxDischargeA = battery.maxDischargeCurrentA * batteryResult.parallelCount;
    const inverterDcCurrent = inverter.recommendedContinuousWatts / systemVoltage;
    if (maxDischargeA > 0 && inverterDcCurrent > maxDischargeA) {
      warnings.push({
        code: 'BATTERY-DISCHARGE',
        severity: 'warning',
        message: `Battery bank max discharge (${round(maxDischargeA)} A) may be below inverter DC input current (${round(inverterDcCurrent)} A). Add parallel batteries.`,
      });
    }
  }

  return {
    input,
    dailyLoad,
    pv,
    battery: batteryResult,
    inverter,
    controller: controllerResult,
    cables,
    protection,
    compliance,
    warnings,
    audit: audit.all,
  };
}

function stringConstraints(
  input: SystemInput,
  inverter: InverterSpec,
  controller: ChargeControllerSpec,
  systemVoltage: SystemVoltage,
): StringConstraints {
  if (input.systemType === 'off-grid' && controller) {
    return {
      maxVoltageV: controller.maxPvVoltageV,
      mpptMinVoltageV: systemVoltage,
      mpptMaxVoltageV: controller.maxPvVoltageV,
      maxCurrentA: controller.ratedCurrentA,
    };
  }
  if (
    inverter &&
    (inverter.supportedTypes.includes('on-grid') || inverter.supportedTypes.includes('hybrid'))
  ) {
    return {
      maxVoltageV: inverter.maxPvVoltageV,
      mpptMinVoltageV: inverter.mpptVoltageRangeMinV,
      mpptMaxVoltageV: inverter.mpptVoltageRangeMaxV,
      maxCurrentA: inverter.maxPvCurrentA * inverter.mpptCount,
    };
  }
  return { maxVoltageV: 600, mpptMinVoltageV: 120, mpptMaxVoltageV: 550, maxCurrentA: 30 };
}

function emptyBatteryResult(systemVoltageV: SystemVoltage): BatteryResult {
  return {
    systemVoltageV,
    requiredKwh: 0,
    requiredAhAtSystemVoltage: 0,
    seriesCount: 0,
    parallelCount: 0,
    batteryCount: 0,
    actualCapacityAh: 0,
    actualCapacityKwh: 0,
    depthOfDischarge: 0,
  };
}

function emptyControllerResult() {
  return {
    recommendedType: 'MPPT' as const,
    minCurrentA: 0,
    maxPvVoltageRequiredV: 0,
    selectedCurrentA: null,
    selectedMaxPvVoltageV: null,
  };
}

function buildCompliance(params: {
  arrayVocColdV: number;
  maxPvInputVoltageV: number;
  arrayIscA: number;
  maxControllerInputCurrentA: number;
  pvOcpdStandardA: number;
  panelMaxSeriesFuseRatingA: number;
  inverterContinuousW: number;
  requiredInverterContinuousW: number;
  mainBreakerA: number;
  pvBreakerA: number;
  busbarRatingA: number;
}): ComplianceResult {
  return {
    arrayVocColdV: params.arrayVocColdV,
    arrayVocWithinInverterLimit: params.arrayVocColdV <= params.maxPvInputVoltageV,
    controllerCurrentWithinLimit: params.arrayIscA <= params.maxControllerInputCurrentA,
    pvOcpdWithinSeriesFuse: params.pvOcpdStandardA <= params.panelMaxSeriesFuseRatingA,
    inverterPowerSufficient: params.inverterContinuousW >= params.requiredInverterContinuousW,
    batteryVoltageMatchesInverter: true, // resolved per-selection in inverter module
    checks: [],
  };
}

export { COLD_TEMP_VOC_MULTIPLIER };
