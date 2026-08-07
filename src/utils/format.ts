import type { CableUnit, LengthUnit, PowerUnit, TempUnit, UnitSettings } from '../store/settings';

/** Round a number to a fixed max decimal count without trailing zeros. */
export function formatNumber(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(maxDecimals));
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(rounded);
}

/** Convert mm² cross-section to the nearest standard AWG/kcmil label. */
export function mm2ToAwgLabel(mm2: number): string {
  if (!Number.isFinite(mm2) || mm2 <= 0) return '—';
  if (mm2 >= 107) {
    const kcmil = mm2 / 0.5067;
    return `${formatNumber(kcmil, 0)} kcmil`;
  }
  // area(mm²) = (pi/4)*0.127² * 92^(2*(36-AWG)/39)
  const awg = 36 - (39 / (2 * Math.log(92))) * Math.log(mm2 / ((Math.PI / 4) * 0.127 * 0.127));
  const rounded = Math.round(awg);
  if (rounded >= 1) return `${rounded} AWG`;
  if (rounded === 0) return '1/0 AWG';
  if (rounded === -1) return '2/0 AWG';
  if (rounded === -2) return '3/0 AWG';
  return '4/0 AWG';
}

export function formatPower(watts: number, unit: PowerUnit): string {
  if (!Number.isFinite(watts)) return '—';
  if (unit === 'kw') return `${formatNumber(watts / 1000, 2)} kW`;
  return `${formatNumber(watts, watts >= 1000 ? 0 : 1)} W`;
}

export function formatLength(meters: number, unit: LengthUnit): string {
  if (!Number.isFinite(meters)) return '—';
  if (unit === 'ft') return `${formatNumber(meters * 3.28084, 1)} ft`;
  return `${formatNumber(meters, 1)} m`;
}

export function formatCableSize(mm2: number, unit: CableUnit): string {
  if (!Number.isFinite(mm2)) return '—';
  if (unit === 'awg') return mm2ToAwgLabel(mm2);
  return `${formatNumber(mm2, 1)} mm²`;
}

export function formatTemperature(celsius: number, unit: TempUnit): string {
  if (!Number.isFinite(celsius)) return '—';
  if (unit === 'f') return `${formatNumber((celsius * 9) / 5 + 32, 0)} °F`;
  return `${formatNumber(celsius, 0)} °C`;
}

export interface UnitFormatters {
  power: (watts: number) => string;
  length: (meters: number) => string;
  cableSize: (mm2: number) => string;
  temperature: (celsius: number) => string;
  number: (value: number, maxDecimals?: number) => string;
}

/** Build a set of formatting functions bound to the given unit settings. */
export function createFormatters(units: UnitSettings): UnitFormatters {
  return {
    power: (watts) => formatPower(watts, units.power),
    length: (meters) => formatLength(meters, units.length),
    cableSize: (mm2) => formatCableSize(mm2, units.cable),
    temperature: (celsius) => formatTemperature(celsius, units.temp),
    number: (value, maxDecimals) => formatNumber(value, maxDecimals),
  };
}

export const UNIT_LABELS: Record<'power' | 'length' | 'cable' | 'temp', Record<string, string>> = {
  power: { w: 'Watts (W)', kw: 'Kilowatts (kW)' },
  length: { m: 'Meters (m)', ft: 'Feet (ft)' },
  cable: { mm2: 'mm²', awg: 'AWG' },
  temp: { c: 'Celsius (°C)', f: 'Fahrenheit (°F)' },
};
