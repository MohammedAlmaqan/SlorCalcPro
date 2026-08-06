import type { AuditTrail } from '../audit';
import type { ChargeControllerSpec, ControllerResult, ControllerType } from '../types';
import { round } from '../data/cableTable';

/** Charge controller temp-cold Voc multiplier (NEC 690.7). */
export const COLD_TEMP_VOC_MULTIPLIER = 1.25;

/** Efficiency comparison (study §2.5): PWM ~79%, MPPT ~94%. */
export const PWM_EFFICIENCY = 0.79;
export const MPPT_EFFICIENCY = 0.94;

/**
 * Charge controller sizing (study §2.5):
 *   Controller Current ≥ PV Array Isc × 1.25
 *   Max input voltage must exceed worst-case cold Voc.
 *   MPPT recommended for systems > 200 W.
 */
export function sizeChargeController(
  arrayIscA: number,
  arrayVocV: number,
  arrayWatts: number,
  controller: ChargeControllerSpec | null,
  audit: AuditTrail,
): ControllerResult {
  const recommendedType: ControllerType = arrayWatts > 200 ? 'MPPT' : 'PWM';
  const minCurrentA = arrayIscA * 1.25;
  const maxPvVoltageRequiredV = arrayVocV * COLD_TEMP_VOC_MULTIPLIER;

  audit.add({
    id: 'controller.current',
    description: 'Charge controller minimum current rating',
    formula: 'arrayIsc × 1.25',
    values: { arrayIscA: round(arrayIscA) },
    result: round(minCurrentA),
    unit: 'A',
  });

  audit.add({
    id: 'controller.voltage',
    description: 'Controller maximum PV input voltage required',
    formula: 'arrayVoc × coldTempMultiplier',
    values: { arrayVocV: round(arrayVocV), multiplier: COLD_TEMP_VOC_MULTIPLIER },
    result: round(maxPvVoltageRequiredV),
    unit: 'V',
  });

  audit.add({
    id: 'controller.type',
    description: 'Controller type recommendation',
    formula: 'MPPT if arrayPower > 200 W, else PWM',
    values: {
      arrayWatts: round(arrayWatts),
      efficiency: recommendedType === 'MPPT' ? MPPT_EFFICIENCY : PWM_EFFICIENCY,
    },
    result: recommendedType,
  });

  const selectedCurrentA = controller?.ratedCurrentA ?? null;
  const selectedMaxPvVoltageV = controller?.maxPvVoltageV ?? null;

  if (controller) {
    audit.add({
      id: 'controller.selected',
      description: 'Selected controller verification',
      formula: 'rated ≥ minCurrent · maxPvV ≥ requiredPvV',
      values: {
        selectedCurrentA: controller.ratedCurrentA,
        requiredCurrentA: round(minCurrentA),
        selectedMaxPvVoltageV: controller.maxPvVoltageV,
        requiredMaxPvVoltageV: round(maxPvVoltageRequiredV),
      },
      result: 'checked',
    });
  }

  return {
    recommendedType,
    minCurrentA,
    maxPvVoltageRequiredV,
    selectedCurrentA,
    selectedMaxPvVoltageV,
  };
}
