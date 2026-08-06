import { AuditTrail } from '../audit';
import { calculateDailyLoad } from '../formulas/load';
import type { LoadItem } from '../types';

export const WORKED_LOADS: LoadItem[] = [
  {
    id: 'l1',
    name: 'LED Lights',
    quantity: 5,
    powerWatts: 10,
    hoursPerDay: 5,
    isAc: true,
    isSimultaneous: true,
    isInductive: false,
  },
  {
    id: 'l2',
    name: 'Refrigerator',
    quantity: 1,
    powerWatts: 150,
    hoursPerDay: 8,
    isAc: true,
    isSimultaneous: true,
    isInductive: true,
    surgeFactor: 5,
  },
  {
    id: 'l3',
    name: 'TV',
    quantity: 1,
    powerWatts: 100,
    hoursPerDay: 4,
    isAc: true,
    isSimultaneous: true,
    isInductive: false,
  },
  {
    id: 'l4',
    name: 'Water Pump',
    quantity: 1,
    powerWatts: 500,
    hoursPerDay: 1,
    isAc: true,
    isSimultaneous: true,
    isInductive: true,
    surgeFactor: 5,
  },
];

describe('calculateDailyLoad', () => {
  const result = calculateDailyLoad(WORKED_LOADS, 0.9, new AuditTrail());

  it('computes daily energy per study §2.1', () => {
    // AC Wh = 5×10×5 + 150×8 + 100×4 + 500×1 = 250 + 1200 + 400 + 500
    expect(result.acWhPerDay).toBeCloseTo(2350, 2);
    expect(result.dcWhPerDay).toBe(0);
    expect(result.totalWhPerDay).toBeCloseTo(2350, 2);
  });

  it('converts AC energy to DC-equivalent at the inverter input', () => {
    expect(result.dcEquivalentWhPerDay).toBeCloseTo(2350 / 0.9, 2);
  });

  it('computes the peak simultaneous load', () => {
    // 50 + 150 + 100 + 500
    expect(result.peakSimultaneousWatts).toBeCloseTo(800, 2);
  });

  it('applies surge factor to motor loads', () => {
    // 50×1 + 150×5 + 100×1 + 500×5 = 50 + 750 + 100 + 2500
    expect(result.peakSurgeWatts).toBeCloseTo(3400, 2);
  });
});
