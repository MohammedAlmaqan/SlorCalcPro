import {
  REFERENCE_BATTERY,
  REFERENCE_CONTROLLER,
  REFERENCE_PANEL,
  referenceInverterFor,
} from '../core/data/referenceComponents';
import type { DesignResult } from '../core/types';
import type { UnitSettings } from '../store/settings';
import { formatCableSize } from '../utils/format';

export interface BomItem {
  category: string;
  part: string;
  spec: string;
  qty: number;
  unit: string;
}

export interface BomCategory {
  category: string;
  items: BomItem[];
}

const DEFAULT_CABLE_LENGTHS = { pv: 10, dc: 2, ac: 10 } as const;

/** Build a professional bill of materials from a completed design. Pure TS. */
export function buildBom(result: DesignResult, units?: UnitSettings): BomItem[] {
  const { input, pv, battery, cables, protection } = result;
  const items: BomItem[] = [];
  const cableSize = (mm2: number) => formatCableSize(mm2, units?.cable ?? 'mm2');
  const panel = input.selected?.panel ?? REFERENCE_PANEL;
  const batterySpec = input.selected?.battery ?? REFERENCE_BATTERY;
  const controllerSpec = input.selected?.controller ?? REFERENCE_CONTROLLER;
  const inverterSpec = input.selected?.inverter ?? referenceInverterFor(input.systemType);
  const isOnGrid = input.systemType === 'on-grid';
  const isOffGrid = input.systemType === 'off-grid';

  if (panel) {
    items.push({
      category: 'PV modules',
      part: `${panel.brand} ${panel.model}`,
      spec: `${panel.pmaxW} W · Voc ${panel.vocV} V · Isc ${panel.iscA} A`,
      qty: pv.totalPanelCount,
      unit: 'pc',
    });
    items.push({
      category: 'PV modules',
      part: 'PV array configuration',
      spec: `${pv.seriesCount}S × ${pv.parallelCount}P · ${pv.actualArrayWatts} W · Vmp ${pv.arrayVmpV} V`,
      qty: 1,
      unit: 'config',
    });
  }

  if (inverterSpec) {
    items.push({
      category: 'Inverter',
      part: `${inverterSpec.brand} ${inverterSpec.model}`,
      spec: `${inverterSpec.continuousPowerW} W continuous · ${inverterSpec.surgePowerW} W surge · ${inverterSpec.supportedTypes.join('/')}`,
      qty: 1,
      unit: 'pc',
    });
  }

  if (!isOnGrid) {
    if (batterySpec) {
      items.push({
        category: 'Battery bank',
        part: `${batterySpec.brand} ${batterySpec.model}`,
        spec: `${batterySpec.nominalVoltageV} V · ${batterySpec.capacityAh} Ah · ${batterySpec.chemistry} · DoD ${Math.round(batterySpec.recommendedDoD * 100)}%`,
        qty: battery.batteryCount,
        unit: 'pc',
      });
      items.push({
        category: 'Battery bank',
        part: 'Bank configuration',
        spec: `${battery.seriesCount}S × ${battery.parallelCount}P · ${battery.actualCapacityAh} Ah @ ${battery.systemVoltageV} V`,
        qty: 1,
        unit: 'config',
      });
    }

    if (isOffGrid && controllerSpec) {
      items.push({
        category: 'Charge controller',
        part: `${controllerSpec.brand} ${controllerSpec.model}`,
        spec: `${controllerSpec.type} · ${controllerSpec.ratedCurrentA} A · max PV ${controllerSpec.maxPvVoltageV} V`,
        qty: 1,
        unit: 'pc',
      });
    }
  }

  const pvRunM = 2 * (input.pvCableLengthM ?? DEFAULT_CABLE_LENGTHS.pv);
  const dcRunM = 2 * (input.dcCableLengthM ?? DEFAULT_CABLE_LENGTHS.dc);
  const acRunM = 2 * (input.acCableLengthM ?? DEFAULT_CABLE_LENGTHS.ac);

  items.push(
    {
      category: 'Cables',
      part: `PV source cable ${cableSize(cables.pvSource.crossSectionMm2)}`,
      spec: `Rated ${cables.pvSource.currentA} A · drop ${cables.pvSource.voltageDropPercent}%`,
      qty: pvRunM,
      unit: 'm (run)',
    },
    {
      category: 'Cables',
      part: `DC output cable ${cableSize(cables.dcOutput.crossSectionMm2)}`,
      spec: `Rated ${cables.dcOutput.currentA} A · drop ${cables.dcOutput.voltageDropPercent}%`,
      qty: dcRunM,
      unit: 'm (run)',
    },
    {
      category: 'Cables',
      part: `AC output cable ${cableSize(cables.acOutput.crossSectionMm2)}`,
      spec: `Rated ${cables.acOutput.currentA} A · drop ${cables.acOutput.voltageDropPercent}%`,
      qty: acRunM,
      unit: 'm (run)',
    },
  );

  items.push(
    {
      category: 'Protection',
      part: 'PV source OCPD (fuse/breaker)',
      spec: `${protection.pvSourceOcpdStandardA} A DC`,
      qty: pv.parallelCount,
      unit: 'pc',
    },
    {
      category: 'Protection',
      part: 'Inverter AC breaker',
      spec: `${protection.acBreakerStandardA} A AC`,
      qty: 1,
      unit: 'pc',
    },
    {
      category: 'Protection',
      part: 'DC isolator switch',
      spec: protection.dcIsolatorRequired ? 'Required' : 'Optional',
      qty: 1,
      unit: 'pc',
    },
    {
      category: 'Protection',
      part: 'Surge protection device (SPD)',
      spec: `${protection.spdType} (${input.systemType === 'off-grid' ? 'battery-side' : 'AC/DC'})`,
      qty: 2,
      unit: 'pc',
    },
  );

  if (protection.acIsolatorRequired) {
    items.push({
      category: 'Protection',
      part: 'AC isolator / disconnect',
      spec: `${protection.acBreakerStandardA} A`,
      qty: 1,
      unit: 'pc',
    });
  }
  if (protection.atsRequired) {
    items.push({
      category: 'Protection',
      part: 'Automatic transfer switch (ATS)',
      spec: '< 20 ms transfer',
      qty: 1,
      unit: 'pc',
    });
  }

  return items;
}

/** Group BOM items by category for tabular display. */
export function groupBom(items: BomItem[]): BomCategory[] {
  const categories: BomCategory[] = [];
  for (const item of items) {
    let category = categories.find((c) => c.category === item.category);
    if (!category) {
      category = { category: item.category, items: [] };
      categories.push(category);
    }
    category.items.push(item);
  }
  return categories;
}
