/** Seed domain types (catalog/reference data) shared by data modules and repos. */

export type ComponentKind = 'panel' | 'inverter' | 'battery' | 'controller' | 'cable';

export interface PshLocation {
  id: string;
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
  winterPsh: number;
  summerPsh: number;
  recommendedTilt?: number;
  isManual?: boolean;
  note?: string;
}

export interface AppliancePreset {
  id: string;
  name: string;
  powerWatts: number;
  hoursPerDay: number;
  isAc: boolean;
  isSimultaneous: boolean;
  isInductive: boolean;
  surgeFactor?: number;
}

/** A component row as persisted in the `components` table. */
export interface ComponentRecord<T> {
  id: string;
  kind: ComponentKind;
  brand: string;
  model: string;
  spec: T;
  isReference: boolean;
  isFavorite: boolean;
}
