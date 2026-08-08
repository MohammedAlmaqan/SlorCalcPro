import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, List, Text, TextInput, useTheme } from 'react-native-paper';

import {
  TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER,
  TOTAL_LOAD_ESTIMATE_HOURS,
} from '@/core/formulas/load';
import type { LoadItem } from '@/core/types';
import { LOAD_BUNDLES, type LoadBundle } from '@/data/bundles';
import type { AppliancePreset } from '@/data/types';
import { newId } from '@/utils/id';

import { NumberField, RowActionButton, SegmentedField, StepperField } from './form';

/** Editable load audit: preset-driven appliance rows with full editing. */
export function LoadEditor(props: {
  loads: LoadItem[];
  presets: AppliancePreset[];
  onChangeLoads: (loads: LoadItem[]) => void;
}) {
  const { loads, presets, onChangeLoads } = props;
  const [query, setQuery] = useState('');
  const [presetMode, setPresetMode] = useState(false);
  const theme = useTheme();

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q === '' ? presets : presets.filter((p) => p.name.toLowerCase().includes(q));
    return list.slice(0, 20);
  }, [presets, query]);

  const updateLoad = (id: string, patch: Partial<LoadItem>) => {
    onChangeLoads(loads.map((load) => (load.id === id ? { ...load, ...patch } : load)));
  };

  const removeLoad = (id: string) => {
    onChangeLoads(loads.filter((load) => load.id !== id));
  };

  const addFromPreset = (preset: AppliancePreset) => {
    onChangeLoads([
      ...loads,
      {
        id: newId(),
        name: preset.name,
        quantity: 1,
        powerWatts: preset.powerWatts,
        hoursPerDay: preset.hoursPerDay,
        isAc: preset.isAc,
        isSimultaneous: preset.isSimultaneous,
        isInductive: preset.isInductive,
        surgeFactor: preset.surgeFactor,
      },
    ]);
  };

  const addFromBundle = (bundle: LoadBundle) => {
    const added = bundle.appliances.map((appliance) => ({
      id: newId(),
      quantity: 1,
      ...appliance,
    }));
    onChangeLoads([...loads, ...added]);
    setQuery('');
    setPresetMode(false);
  };

  const addCustom = () => {
    onChangeLoads([
      ...loads,
      {
        id: newId(),
        name: 'New appliance',
        quantity: 1,
        powerWatts: 100,
        hoursPerDay: 2,
        isAc: true,
        isSimultaneous: false,
        isInductive: false,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Button
        icon={presetMode ? 'close' : 'lightbulb-plus-outline'}
        mode={presetMode ? 'contained-tonal' : 'outlined'}
        onPress={() => setPresetMode((v) => !v)}
        style={styles.addButton}
      >
        Add appliance
      </Button>

      {presetMode ? (
        <Card mode="outlined" style={styles.presetCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.bundleLabel}>
              Quick-start bundles
            </Text>
            <View style={styles.chips}>
              {LOAD_BUNDLES.map((bundle) => (
                <Chip
                  key={bundle.id}
                  icon={bundle.icon}
                  onPress={() => addFromBundle(bundle)}
                  style={styles.chip}
                >
                  {bundle.name}
                </Chip>
              ))}
            </View>
            <Text variant="labelLarge" style={styles.bundleLabel}>
              Single appliances
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Search appliances…"
              value={query}
              onChangeText={setQuery}
              dense
              left={<TextInput.Icon icon="magnify" />}
            />
            <View style={styles.chips}>
              {filteredPresets.map((preset) => (
                <Chip key={preset.id} onPress={() => addFromPreset(preset)} style={styles.chip}>
                  {preset.name}
                </Chip>
              ))}
            </View>
            <Button icon="plus" mode="text" onPress={addCustom} style={styles.addButton}>
              Custom appliance
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {loads.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No appliances yet. Add some to size the system.
        </Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {loads.map((load) => (
            <LoadRow
              key={load.id}
              load={load}
              onChange={(p) => updateLoad(load.id, p)}
              onRemove={() => removeLoad(load.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LoadRow(props: {
  load: LoadItem;
  onChange: (patch: Partial<LoadItem>) => void;
  onRemove: () => void;
}) {
  const { load, onChange, onRemove } = props;
  const theme = useTheme();

  return (
    <Card mode="outlined" style={styles.rowCard}>
      <Card.Content>
        <View style={styles.rowHeader}>
          <TextInput
            mode="outlined"
            label="Appliance"
            value={load.name}
            onChangeText={(name) => onChange({ name })}
            dense
            style={styles.nameInput}
          />
          <RowActionButton
            icon="delete-outline"
            onPress={onRemove}
            accessibilityLabel="Remove appliance"
          />
        </View>
        <StepperField
          label="Quantity"
          value={load.quantity}
          onChange={(quantity) => onChange({ quantity })}
          min={1}
        />
        <View style={styles.rowGrid}>
          <NumberField
            label="Power"
            value={load.powerWatts}
            onChange={(powerWatts) => onChange({ powerWatts: powerWatts ?? undefined })}
            unit="W"
          />
          <NumberField
            label="Hours / day"
            value={load.hoursPerDay}
            onChange={(hoursPerDay) => onChange({ hoursPerDay: hoursPerDay ?? undefined })}
            unit="h"
          />
        </View>
        <SegmentedField
          label="Circuit"
          value={load.isAc ? 'AC' : 'DC'}
          options={[
            { value: 'AC', label: 'AC' },
            { value: 'DC', label: 'DC' },
          ]}
          onChange={(v) => onChange({ isAc: v === 'AC' })}
        />
        <SegmentedField
          label="Peak simultaneous load"
          value={load.isSimultaneous ? 'Yes' : 'No'}
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          onChange={(v) => onChange({ isSimultaneous: v === 'Yes' })}
        />
        <SegmentedField
          label="Motor / inductive"
          value={load.isInductive ? 'Yes' : 'No'}
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          onChange={(v) => onChange({ isInductive: v === 'Yes' })}
        />
        {load.isInductive ? (
          <NumberField
            label="Surge factor"
            value={load.surgeFactor ?? 5}
            onChange={(surgeFactor) => onChange({ surgeFactor: surgeFactor ?? 5 })}
            helperText="Startup surge multiplier (motors typically 3–7×)."
          />
        ) : null}
        <List.Item
          title="Row summary"
          description={`${load.quantity} × ${load.powerWatts} W × ${load.hoursPerDay} h = ${load.quantity * load.powerWatts * load.hoursPerDay} Wh/day${load.isAc ? ' (AC)' : ' (DC)'}`}
          left={() => (
            <List.Icon
              icon={load.isAc ? 'power-plug-outline' : 'battery-charging'}
              color={theme.colors.primary}
            />
          )}
        />
      </Card.Content>
    </Card>
  );
}

/**
 * Total-load editor for the 'total' load mode: enter the whole site's daily
 * energy instead of listing appliances. Peak/surge are optional and estimated
 * when left blank.
 */
export function TotalLoadEditor(props: {
  totalDailyKwh: number | null;
  totalPeakKw: number | null;
  totalSurgeKw: number | null;
  totalLoadIsAc: boolean;
  onChange: (patch: {
    totalDailyKwh: number | null;
    totalPeakKw: number | null;
    totalSurgeKw: number | null;
    totalLoadIsAc: boolean;
  }) => void;
}) {
  const { totalDailyKwh, totalPeakKw, totalSurgeKw, totalLoadIsAc, onChange } = props;
  const theme = useTheme();

  const peakKw = totalPeakKw ?? (totalDailyKwh ?? 0) / TOTAL_LOAD_ESTIMATE_HOURS;
  const surgeKw = totalSurgeKw ?? peakKw * TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER;

  return (
    <View style={styles.container}>
      <NumberField
        label="Total daily energy"
        value={totalDailyKwh}
        onChange={(v) => onChange({ totalDailyKwh: v, totalPeakKw, totalSurgeKw, totalLoadIsAc })}
        unit="kWh/day"
        helperText="Whole-site daily consumption, e.g. from a utility bill or meter."
      />
      <NumberField
        label="Peak simultaneous load (optional)"
        value={totalPeakKw}
        onChange={(v) => onChange({ totalDailyKwh, totalPeakKw: v, totalSurgeKw, totalLoadIsAc })}
        unit="kW"
        helperText={`Estimated as ${TOTAL_LOAD_ESTIMATE_HOURS} h/day of the daily energy when blank.`}
      />
      <NumberField
        label="Peak surge load (optional)"
        value={totalSurgeKw}
        onChange={(v) => onChange({ totalDailyKwh, totalPeakKw, totalSurgeKw: v, totalLoadIsAc })}
        unit="kW"
        helperText={`Estimated as peak × ${TOTAL_LOAD_DEFAULT_SURGE_MULTIPLIER} when blank (motor startup).`}
      />
      <SegmentedField
        label="Circuit"
        value={totalLoadIsAc ? 'AC' : 'DC'}
        options={[
          { value: 'AC', label: 'AC' },
          { value: 'DC', label: 'DC' },
        ]}
        onChange={(v) =>
          onChange({ totalDailyKwh, totalPeakKw, totalSurgeKw, totalLoadIsAc: v === 'AC' })
        }
      />
      <List.Item
        title="Sizing summary"
        description={`${totalDailyKwh ?? 0} kWh/day · peak ≈ ${peakKw.toFixed(1)} kW · surge ≈ ${surgeKw.toFixed(1)} kW${totalLoadIsAc ? ' · AC (via inverter)' : ' · DC (direct)'}`}
        left={() => (
          <List.Icon
            icon={totalLoadIsAc ? 'power-plug-outline' : 'battery-charging'}
            color={theme.colors.primary}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  presetCard: {
    marginBottom: 4,
  },
  bundleLabel: {
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  chip: {
    marginBottom: 4,
  },
  rowCard: {
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
});
