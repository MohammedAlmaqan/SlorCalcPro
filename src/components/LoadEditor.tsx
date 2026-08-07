import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, List, Text, TextInput, useTheme } from 'react-native-paper';

import type { LoadItem } from '@/core/types';
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
