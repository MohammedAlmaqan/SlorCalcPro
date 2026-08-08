import type { LoadItem, LoadMode } from '../core/types';
import type { ProjectWithScenarios } from '../db/repos/projects';

export const EXPORT_FORMAT = 'solarcalcpro-project' as const;
export const EXPORT_VERSION = 2 as const;

export interface ProjectExport {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  project: {
    name: string;
    clientName: string;
    notes: string;
    scenarios: ImportedScenario[];
  };
}

export interface ImportedScenario {
  name: string;
  isActive: boolean;
  systemType: string;
  systemVoltageV: number | null;
  chemistry: string;
  autonomyDays: number;
  winterPsh: number;
  summerPsh: number;
  pshLocationId: string | null;
  inverterEfficiency: number | null;
  systemLossFactor: number | null;
  dcVoltageDropPercent: number | null;
  acVoltageDropPercent: number | null;
  minTemperatureC: number | null;
  tempDeratingFactor: number | null;
  pvCableLengthM: number | null;
  dcCableLengthM: number | null;
  acCableLengthM: number | null;
  busbarRatingA: number | null;
  mainBreakerA: number | null;
  selectedPanelId: string | null;
  selectedInverterId: string | null;
  selectedBatteryId: string | null;
  selectedControllerId: string | null;
  loadMode: LoadMode;
  totalDailyKwh: number | null;
  totalPeakKw: number | null;
  totalSurgeKw: number | null;
  totalLoadIsAc: boolean;
  loads: LoadItem[];
  designResult: unknown;
}

/** Serialize a project (with scenarios) for JSON backup. */
export function exportProject(project: ProjectWithScenarios): string {
  const payload: ProjectExport = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      clientName: project.clientName,
      notes: project.notes,
      scenarios: project.scenarios.map((scenario) => ({
        name: scenario.name,
        isActive: scenario.isActive,
        systemType: scenario.systemType,
        systemVoltageV: scenario.systemVoltageV,
        chemistry: scenario.chemistry,
        autonomyDays: scenario.autonomyDays,
        winterPsh: scenario.winterPsh,
        summerPsh: scenario.summerPsh,
        pshLocationId: scenario.pshLocation?.id ?? null,
        inverterEfficiency: scenario.inverterEfficiency,
        systemLossFactor: scenario.systemLossFactor,
        dcVoltageDropPercent: scenario.dcVoltageDropPercent,
        acVoltageDropPercent: scenario.acVoltageDropPercent,
        minTemperatureC: scenario.minTemperatureC,
        tempDeratingFactor: scenario.tempDeratingFactor,
        pvCableLengthM: scenario.pvCableLengthM,
        dcCableLengthM: scenario.dcCableLengthM,
        acCableLengthM: scenario.acCableLengthM,
        busbarRatingA: scenario.busbarRatingA,
        mainBreakerA: scenario.mainBreakerA,
        selectedPanelId: scenario.selectedPanelId,
        selectedInverterId: scenario.selectedInverterId,
        selectedBatteryId: scenario.selectedBatteryId,
        selectedControllerId: scenario.selectedControllerId,
        loadMode: scenario.loadMode,
        totalDailyKwh: scenario.totalDailyKwh,
        totalPeakKw: scenario.totalPeakKw,
        totalSurgeKw: scenario.totalSurgeKw,
        totalLoadIsAc: scenario.totalLoadIsAc,
        loads: scenario.loads,
        designResult: scenario.designResult,
      })),
    },
  };
  return JSON.stringify(payload, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Validate and normalize an imported project backup. Throws on malformed input. */
export function parseProjectImport(text: string): ProjectExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON backup file.');
  }
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) {
    throw new Error('This file is not a SlorCalcPro project backup.');
  }
  const project = raw.project;
  if (!isRecord(project) || typeof project.name !== 'string') {
    throw new Error('Backup is missing project data.');
  }
  const scenarios = Array.isArray(project.scenarios) ? project.scenarios : [];
  const normalized: ProjectExport = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    project: {
      name: project.name,
      clientName: typeof project.clientName === 'string' ? project.clientName : '',
      notes: typeof project.notes === 'string' ? project.notes : '',
      scenarios: scenarios.filter(isRecord).map((s) => ({
        name: typeof s.name === 'string' ? s.name : 'Imported scenario',
        isActive: s.isActive === true,
        systemType: typeof s.systemType === 'string' ? s.systemType : 'off-grid',
        systemVoltageV: optionalNumber(s.systemVoltageV),
        chemistry: typeof s.chemistry === 'string' ? s.chemistry : 'lifepo4',
        autonomyDays: optionalNumber(s.autonomyDays) ?? 2,
        winterPsh: optionalNumber(s.winterPsh) ?? 4,
        summerPsh: optionalNumber(s.summerPsh) ?? 6,
        pshLocationId: typeof s.pshLocationId === 'string' ? s.pshLocationId : null,
        inverterEfficiency: optionalNumber(s.inverterEfficiency),
        systemLossFactor: optionalNumber(s.systemLossFactor),
        dcVoltageDropPercent: optionalNumber(s.dcVoltageDropPercent),
        acVoltageDropPercent: optionalNumber(s.acVoltageDropPercent),
        minTemperatureC: optionalNumber(s.minTemperatureC),
        tempDeratingFactor: optionalNumber(s.tempDeratingFactor),
        pvCableLengthM: optionalNumber(s.pvCableLengthM),
        dcCableLengthM: optionalNumber(s.dcCableLengthM),
        acCableLengthM: optionalNumber(s.acCableLengthM),
        busbarRatingA: optionalNumber(s.busbarRatingA),
        mainBreakerA: optionalNumber(s.mainBreakerA),
        selectedPanelId: typeof s.selectedPanelId === 'string' ? s.selectedPanelId : null,
        selectedInverterId: typeof s.selectedInverterId === 'string' ? s.selectedInverterId : null,
        selectedBatteryId: typeof s.selectedBatteryId === 'string' ? s.selectedBatteryId : null,
        selectedControllerId:
          typeof s.selectedControllerId === 'string' ? s.selectedControllerId : null,
        loadMode: s.loadMode === 'total' ? 'total' : 'appliances',
        totalDailyKwh: optionalNumber(s.totalDailyKwh),
        totalPeakKw: optionalNumber(s.totalPeakKw),
        totalSurgeKw: optionalNumber(s.totalSurgeKw),
        totalLoadIsAc: s.totalLoadIsAc !== false,
        loads: Array.isArray(s.loads)
          ? (s.loads.filter(
              (l): l is LoadItem => isRecord(l) && typeof l.id === 'string',
            ) as LoadItem[])
          : [],
        designResult: isRecord(s.designResult) ? s.designResult : null,
      })),
    },
  };
  return normalized;
}
