import { applyStandardsPolicy } from '../standards/policy';
import type { Warning } from '../types';

const STANDARD_ERROR: Warning = {
  code: 'NEC690-7-VOC',
  severity: 'error',
  standard: 'NEC 690.7',
  message: 'Array cold Voc exceeds inverter max input voltage.',
};

const STANDARD_WARNING: Warning = {
  code: 'IEC62548-DROP-DC',
  severity: 'warning',
  standard: 'IEC 62548',
  message: 'PV source circuit voltage drop exceeds the limit.',
};

const SAFETY_ERROR: Warning = {
  code: 'CABLE-AMPACITY-PV',
  severity: 'error',
  standard: 'IEC 62548',
  message: 'PV source cable ampacity is insufficient.',
};

const SAFETY_WARNING: Warning = {
  code: 'BATTERY-DISCHARGE',
  severity: 'warning',
  message: 'Battery bank max discharge may be below inverter DC input current.',
};

const ALL = [STANDARD_ERROR, STANDARD_WARNING, SAFETY_ERROR, SAFETY_WARNING];

describe('applyStandardsPolicy', () => {
  it('returns warnings unchanged for strict (and default/undefined)', () => {
    expect(applyStandardsPolicy(ALL, 'strict')).toBe(ALL);
    expect(applyStandardsPolicy(ALL, undefined)).toBe(ALL);
  });

  it('downgrades standards-derived errors to warnings in advisory mode', () => {
    const result = applyStandardsPolicy(ALL, 'advisory');
    expect(result).toHaveLength(4);
    const voc = result.find((w) => w.code === 'NEC690-7-VOC');
    expect(voc?.severity).toBe('warning');
    const ampacity = result.find((w) => w.code === 'CABLE-AMPACITY-PV');
    expect(ampacity?.severity).toBe('error');
    const drop = result.find((w) => w.code === 'IEC62548-DROP-DC');
    expect(drop?.severity).toBe('warning');
  });

  it('removes standards-derived checks but keeps safety checks in off mode', () => {
    const result = applyStandardsPolicy(ALL, 'off');
    expect(result.map((w) => w.code)).toEqual(['CABLE-AMPACITY-PV', 'BATTERY-DISCHARGE']);
  });
});
