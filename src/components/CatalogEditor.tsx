import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import type { AnySpec } from '@/db/repos/catalog';
import type { ComponentKind, ComponentRecord } from '@/data/types';

import { NumberField } from './form';

type DraftValue = number | string | null;
export type SpecDraft = Record<string, DraftValue>;

interface FieldDef {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'enum' | 'text';
  options?: string[];
  decimals?: number;
}

const FIELD_DEFS: Record<ComponentKind, FieldDef[]> = {
  panel: [
    { key: 'pmaxW', label: 'Max power', unit: 'W', type: 'number', decimals: 0 },
    { key: 'vocV', label: 'Open-circuit voltage', unit: 'V', type: 'number' },
    { key: 'vmpV', label: 'MPP voltage', unit: 'V', type: 'number' },
    { key: 'iscA', label: 'Short-circuit current', unit: 'A', type: 'number' },
    { key: 'impA', label: 'MPP current', unit: 'A', type: 'number' },
    { key: 'tempCoeffPmax', label: 'Pmax temp coeff', unit: '%/°C', type: 'number' },
    { key: 'tempCoeffVoc', label: 'Voc temp coeff', unit: '%/°C', type: 'number' },
    {
      key: 'maxSeriesFuseRating',
      label: 'Max series fuse',
      unit: 'A',
      type: 'number',
      decimals: 0,
    },
    {
      key: 'maxSystemVoltage',
      label: 'Max system voltage',
      unit: 'V',
      type: 'number',
      decimals: 0,
    },
  ],
  inverter: [
    {
      key: 'supportedTypes',
      label: 'Supported types',
      type: 'text',
      unit: 'on-grid,hybrid,off-grid',
    },
    { key: 'continuousPowerW', label: 'Continuous power', unit: 'W', type: 'number', decimals: 0 },
    { key: 'surgePowerW', label: 'Surge power', unit: 'W', type: 'number', decimals: 0 },
    {
      key: 'batteryVoltageV',
      label: 'Battery voltage',
      type: 'enum',
      options: ['12', '24', '48', 'none'],
    },
    { key: 'maxPvVoltageV', label: 'Max PV voltage', unit: 'V', type: 'number', decimals: 0 },
    {
      key: 'mpptVoltageRangeMinV',
      label: 'MPPT window min',
      unit: 'V',
      type: 'number',
      decimals: 0,
    },
    {
      key: 'mpptVoltageRangeMaxV',
      label: 'MPPT window max',
      unit: 'V',
      type: 'number',
      decimals: 0,
    },
    { key: 'maxPvCurrentA', label: 'Max PV current', unit: 'A', type: 'number' },
    { key: 'mpptCount', label: 'MPPT trackers', type: 'number', decimals: 0 },
    { key: 'maxAcOutputCurrentA', label: 'Max AC current', unit: 'A', type: 'number' },
    { key: 'efficiency', label: 'Efficiency', type: 'number', decimals: 3 },
  ],
  battery: [
    {
      key: 'chemistry',
      label: 'Chemistry',
      type: 'enum',
      options: ['lifepo4', 'agm-gel', 'flooded'],
    },
    { key: 'nominalVoltageV', label: 'Nominal voltage', unit: 'V', type: 'number' },
    { key: 'capacityAh', label: 'Capacity', unit: 'Ah', type: 'number', decimals: 0 },
    {
      key: 'maxChargeCurrentA',
      label: 'Max charge current',
      unit: 'A',
      type: 'number',
      decimals: 0,
    },
    {
      key: 'maxDischargeCurrentA',
      label: 'Max discharge current',
      unit: 'A',
      type: 'number',
      decimals: 0,
    },
    { key: 'recommendedDoD', label: 'Depth of discharge', type: 'number', decimals: 2 },
    { key: 'cycles', label: 'Cycle life', type: 'number', decimals: 0 },
  ],
  controller: [
    { key: 'type', label: 'Type', type: 'enum', options: ['MPPT', 'PWM'] },
    { key: 'ratedCurrentA', label: 'Rated current', unit: 'A', type: 'number', decimals: 0 },
    { key: 'maxPvVoltageV', label: 'Max PV voltage', unit: 'V', type: 'number', decimals: 0 },
    { key: 'systemVoltageV', label: 'System voltage', type: 'enum', options: ['12', '24', '48'] },
    { key: 'efficiency', label: 'Efficiency', type: 'number', decimals: 3 },
  ],
  cable: [
    { key: 'crossSectionMm2', label: 'Cross section', unit: 'mm²', type: 'number' },
    { key: 'awg', label: 'AWG label', type: 'text', unit: 'e.g. 10 AWG' },
    { key: 'ampacityA', label: 'Ampacity', unit: 'A', type: 'number' },
    { key: 'resistancePerKm', label: 'Resistance', unit: 'Ω/km', type: 'number', decimals: 4 },
  ],
};

const INITIAL: Record<ComponentKind, SpecDraft> = {
  panel: {
    pmaxW: 550,
    vocV: 49.9,
    vmpV: 41.6,
    iscA: 14,
    impA: 13.2,
    tempCoeffPmax: -0.35,
    tempCoeffVoc: -0.29,
    maxSeriesFuseRating: 20,
    maxSystemVoltage: 1000,
  },
  inverter: {
    supportedTypes: 'off-grid,hybrid',
    continuousPowerW: 3000,
    surgePowerW: 6000,
    batteryVoltageV: '48',
    maxPvVoltageV: 500,
    mpptVoltageRangeMinV: 120,
    mpptVoltageRangeMaxV: 450,
    maxPvCurrentA: 18,
    mpptCount: 2,
    maxAcOutputCurrentA: 13,
    efficiency: 0.97,
  },
  battery: {
    chemistry: 'lifepo4',
    nominalVoltageV: 12,
    capacityAh: 100,
    maxChargeCurrentA: 50,
    maxDischargeCurrentA: 100,
    recommendedDoD: 0.8,
    cycles: 6000,
  },
  controller: {
    type: 'MPPT',
    ratedCurrentA: 60,
    maxPvVoltageV: 150,
    systemVoltageV: '48',
    efficiency: 0.94,
  },
  cable: { crossSectionMm2: 2.5, awg: '14 AWG', ampacityA: 15, resistancePerKm: 7.41 },
};

export function specToDraft(kind: ComponentKind, spec: AnySpec): SpecDraft {
  const defs = FIELD_DEFS[kind];
  const draft: SpecDraft = {};
  for (const def of defs) {
    const value = (spec as unknown as Record<string, unknown>)[def.key];
    if (def.type === 'enum') {
      draft[def.key] = value === null || value === undefined ? 'none' : String(value);
    } else if (def.type === 'text') {
      draft[def.key] = value === undefined || value === null ? '' : String(value);
    } else if (def.type === 'number') {
      draft[def.key] = typeof value === 'number' ? value : null;
    }
  }
  return draft;
}

export function draftToSpec(kind: ComponentKind, draft: SpecDraft): AnySpec {
  const spec: Record<string, unknown> = {};
  for (const def of FIELD_DEFS[kind]) {
    const value = draft[def.key];
    if (def.type === 'number') {
      spec[def.key] = typeof value === 'number' ? value : null;
    } else if (def.type === 'enum') {
      if (def.key === 'batteryVoltageV') {
        spec[def.key] = value === 'none' || value === '' ? null : Number(value);
      } else if (def.key === 'systemVoltageV') {
        spec[def.key] = value === 'none' ? null : Number(value);
      } else {
        spec[def.key] = value ?? '';
      }
    } else if (def.key === 'supportedTypes') {
      spec[def.key] = String(value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      spec[def.key] = String(value ?? '');
    }
  }
  return spec as unknown as AnySpec;
}

export function CatalogEditor(props: {
  kind: ComponentKind;
  initial: ComponentRecord<AnySpec> | null;
  onSave: (brand: string, model: string, spec: AnySpec) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { kind, initial, onSave, onCancel } = props;
  const theme = useTheme();
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [draft, setDraft] = useState<SpecDraft>(() =>
    initial ? specToDraft(kind, initial.spec) : { ...INITIAL[kind] },
  );
  const [saving, setSaving] = useState(false);

  const defs = FIELD_DEFS[kind];

  const invalid = useMemo(() => {
    if (brand.trim() === '' || model.trim() === '') return true;
    for (const def of defs) {
      if (def.type !== 'number') continue;
      const value = draft[def.key];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return true;
    }
    return false;
  }, [brand, model, draft, defs]);

  const setField = (key: string, value: DraftValue) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(brand.trim(), model.trim(), draftToSpec(kind, draft));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
        {initial ? `Edit ${kind}` : `New ${kind}`}
      </Text>
      <TextInput
        mode="outlined"
        label="Brand *"
        value={brand}
        onChangeText={setBrand}
        dense
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Model *"
        value={model}
        onChangeText={setModel}
        dense
        style={styles.field}
      />

      {defs.map((def) => {
        if (def.type === 'enum') {
          return (
            <EnumField
              key={def.key}
              def={def}
              value={String(draft[def.key] ?? '')}
              onChange={(v) => setField(def.key, v)}
            />
          );
        }
        if (def.type === 'text') {
          return (
            <TextInput
              key={def.key}
              mode="outlined"
              label={def.label}
              placeholder={def.unit}
              value={String(draft[def.key] ?? '')}
              onChangeText={(v) => setField(def.key, v)}
              dense
              style={styles.field}
            />
          );
        }
        return (
          <NumberField
            key={def.key}
            label={def.label}
            unit={def.unit}
            value={typeof draft[def.key] === 'number' ? (draft[def.key] as number) : null}
            onChange={(v) => setField(def.key, v)}
            decimals={def.decimals ?? 2}
          />
        );
      })}

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel} style={styles.actionButton}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={save}
          loading={saving}
          disabled={invalid}
          style={styles.actionButton}
        >
          Save
        </Button>
      </View>
    </ScrollView>
  );
}

function EnumField(props: { def: FieldDef; value: string; onChange: (value: string) => void }) {
  const { def, value, onChange } = props;
  return (
    <View style={styles.field}>
      <Text variant="labelLarge">{def.label}</Text>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={(def.options ?? []).map((o) => ({ value: o, label: o }))}
        density="small"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    minWidth: 110,
  },
});
