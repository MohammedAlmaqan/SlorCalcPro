import {
  createFormatters,
  formatCableSize,
  formatLength,
  formatNumber,
  formatPower,
  formatTemperature,
  mm2ToAwgLabel,
} from '../format';

describe('unit formatting helpers', () => {
  test('formatNumber rounds and strips trailing zeros', () => {
    expect(formatNumber(1500, 2)).toBe('1,500');
    expect(formatNumber(1.25, 1)).toBe('1.3');
    expect(formatNumber(2, 1)).toBe('2');
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  test('formatPower switches W/kW', () => {
    expect(formatPower(1500, 'w')).toBe('1,500 W');
    expect(formatPower(1500, 'kw')).toBe('1.5 kW');
    expect(formatPower(550, 'w')).toBe('550 W');
  });

  test('formatLength switches m/ft', () => {
    expect(formatLength(10, 'm')).toBe('10 m');
    expect(formatLength(10, 'ft')).toBe('32.8 ft');
  });

  test('mm2ToAwgLabel maps standard sizes', () => {
    expect(mm2ToAwgLabel(5.26)).toBe('10 AWG');
    expect(mm2ToAwgLabel(53.5)).toBe('1/0 AWG');
    expect(mm2ToAwgLabel(2.5)).toBe('13 AWG');
    expect(mm2ToAwgLabel(200)).toBe('395 kcmil');
    expect(mm2ToAwgLabel(0)).toBe('—');
  });

  test('formatCableSize switches mm²/AWG', () => {
    expect(formatCableSize(6, 'mm2')).toBe('6 mm²');
    expect(formatCableSize(6, 'awg')).toBe('9 AWG');
  });

  test('formatTemperature switches °C/°F', () => {
    expect(formatTemperature(-10, 'c')).toBe('-10 °C');
    expect(formatTemperature(-10, 'f')).toBe('14 °F');
    expect(formatTemperature(25, 'c')).toBe('25 °C');
    expect(formatTemperature(25, 'f')).toBe('77 °F');
  });

  test('createFormatters binds the configured units', () => {
    const f = createFormatters({ power: 'kw', length: 'ft', cable: 'awg', temp: 'f' });
    expect(f.power(2000)).toBe('2 kW');
    expect(f.length(10)).toBe('32.8 ft');
    expect(f.cableSize(5.26)).toBe('10 AWG');
    expect(f.temperature(25)).toBe('77 °F');
    expect(f.number(1.234)).toBe('1.2');
  });
});
