import { useMemo } from 'react';

import { useSettingsStore } from '../store/settings';
import { createFormatters, type UnitFormatters } from '../utils/format';

/** Formatters bound to the user's configured units. */
export function useUnitFormatters(): UnitFormatters {
  const units = useSettingsStore((s) => s.units);
  return useMemo(() => createFormatters(units), [units]);
}
