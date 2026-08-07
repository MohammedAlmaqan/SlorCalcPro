import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  List,
  Portal,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import type { AnySpec, SpecByKind } from '@/db/repos/catalog';
import type { ComponentKind, PshLocation } from '@/data/types';
import { useCatalogStore } from '@/store/catalog';

import { NumberField } from './form';

/** One-line human summary of a component's key specs. */
export function specSummary(kind: ComponentKind, spec: AnySpec): string {
  switch (kind) {
    case 'panel': {
      const p = spec as SpecByKind['panel'];
      return `${p.pmaxW} W · ${p.vmpV} Vmp / ${p.iscA} A Isc · Voc ${p.vocV} V`;
    }
    case 'inverter': {
      const i = spec as SpecByKind['inverter'];
      return `${i.continuousPowerW} W cont. (${i.surgePowerW} W surge) · ${i.supportedTypes.join('/')}${i.batteryVoltageV ? ` · ${i.batteryVoltageV} V` : ''}`;
    }
    case 'battery': {
      const b = spec as SpecByKind['battery'];
      return `${b.nominalVoltageV} V · ${b.capacityAh} Ah · DoD ${Math.round(b.recommendedDoD * 100)}% · ${b.chemistry}`;
    }
    case 'controller': {
      const c = spec as SpecByKind['controller'];
      return `${c.type} · ${c.ratedCurrentA} A · max PV ${c.maxPvVoltageV} V · ${c.systemVoltageV} V`;
    }
    case 'cable': {
      const c = spec as SpecByKind['cable'];
      return `${c.crossSectionMm2} mm²${c.awg ? ` (${c.awg})` : ''} · ${c.ampacityA} A ampacity`;
    }
  }
}

export function ComponentSlot(props: {
  kind: ComponentKind;
  label: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClear?: () => void;
  helperText?: string;
}) {
  const { kind, label, selectedId, onSelect, helperText } = props;
  const lists = useCatalogStore((s) => s.lists);
  const loadKind = useCatalogStore((s) => s.loadKind);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const theme = useTheme();

  const filtered = useMemo(() => {
    const items = lists[kind] ?? [];
    const q = query.trim().toLowerCase();
    if (q === '') return items;
    return items.filter(
      (item) => item.brand.toLowerCase().includes(q) || item.model.toLowerCase().includes(q),
    );
  }, [lists, kind, query]);

  const selected = (lists[kind] ?? []).find((item) => item.id === selectedId) ?? null;

  const toggleOpen = () => {
    if (!open && (lists[kind]?.length ?? 0) === 0) loadKind(kind).catch(() => {});
    setOpen((v) => !v);
  };

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <Card mode="outlined" style={styles.slotCard}>
      <Card.Title
        title={label}
        subtitle={
          selected ? `${selected.brand} ${selected.model}` : 'Auto-suggest (not selected yet)'
        }
        right={() =>
          selected ? (
            <View style={styles.slotActions}>
              <Button mode="text" onPress={() => onSelect(null)} compact>
                Clear
              </Button>
              <Button mode="contained-tonal" onPress={toggleOpen} compact>
                Change
              </Button>
            </View>
          ) : (
            <Button mode="contained-tonal" onPress={toggleOpen} compact>
              Choose
            </Button>
          )
        }
      />
      {selected ? (
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {specSummary(kind, selected.spec)}
          </Text>
        </Card.Content>
      ) : null}
      {helperText ? (
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {helperText}
          </Text>
        </Card.Content>
      ) : null}
      {open ? (
        <Card.Content>
          <Searchbar
            placeholder="Search components…"
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.brand} ${item.model}`}
                description={specSummary(kind, item.spec)}
                onPress={() => choose(item.id)}
                left={() => (
                  <List.Icon
                    icon={item.isFavorite ? 'star' : 'star-outline'}
                    color={theme.colors.secondary}
                  />
                )}
              />
            )}
          />
        </Card.Content>
      ) : null}
    </Card>
  );
}

export function PshPicker(props: {
  locations: PshLocation[];
  selectedId: string | null;
  onSelect: (location: PshLocation) => void;
  onClear?: () => void;
}) {
  const { locations, selectedId, onSelect } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const theme = useTheme();

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return locations;
    return locations.filter(
      (l) => l.city.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    );
  }, [locations, query]);

  return (
    <Card mode="outlined" style={styles.slotCard}>
      <Card.Title
        title="Location"
        subtitle={
          selected
            ? `${selected.city}, ${selected.country}`
            : 'Pick a bundled city or enter PSH manually'
        }
        right={() => (
          <Button mode="contained-tonal" onPress={() => setOpen((v) => !v)} compact>
            {selected ? 'Change' : 'Choose'}
          </Button>
        )}
      />
      {selected ? (
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Winter {selected.winterPsh} h · Summer {selected.summerPsh} h
            {selected.recommendedTilt != null ? ` · Tilt ${selected.recommendedTilt}°` : ''}
          </Text>
        </Card.Content>
      ) : null}
      {open ? (
        <Card.Content>
          <Searchbar
            placeholder="Search city or country…"
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.city}, ${item.country}`}
                description={`Winter ${item.winterPsh} h · Summer ${item.summerPsh} h`}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                left={() => <List.Icon icon="map-marker-outline" color={theme.colors.primary} />}
              />
            )}
          />
        </Card.Content>
      ) : null}
    </Card>
  );
}

export function ChipList<T>(props: {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  selected: string;
  onSelect: (key: string) => void;
  emptyText?: string;
}) {
  const { items, getKey, getLabel, selected, onSelect, emptyText } = props;
  return (
    <View style={styles.chips}>
      {items.length === 0 && emptyText ? (
        <Text variant="bodySmall">{emptyText}</Text>
      ) : (
        items.map((item) => {
          const key = getKey(item);
          const isSelected = key === selected;
          return (
            <Chip key={key} selected={isSelected} onPress={() => onSelect(key)} style={styles.chip}>
              {getLabel(item)}
            </Chip>
          );
        })
      )}
    </View>
  );
}

export function ManualPshDialog(props: {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (entry: Omit<PshLocation, 'id' | 'isManual'>) => void;
}) {
  const { visible, onDismiss, onAdd } = props;
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [winterPsh, setWinterPsh] = useState<number | null>(4.0);
  const [summerPsh, setSummerPsh] = useState<number | null>(6.0);
  const [tilt, setTilt] = useState<number | null>(30);

  const reset = () => {
    setCity('');
    setCountry('');
    setWinterPsh(4.0);
    setSummerPsh(6.0);
    setTilt(30);
  };

  const valid =
    city.trim() !== '' && country.trim() !== '' && winterPsh != null && summerPsh != null;

  const add = () => {
    if (!valid) return;
    onAdd({
      country: country.trim(),
      city: city.trim(),
      winterPsh,
      summerPsh,
      recommendedTilt: tilt ?? undefined,
    });
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Manual location</Dialog.Title>
        <Dialog.ScrollArea>
          <View style={styles.manual}>
            <TextInput mode="outlined" label="City *" value={city} onChangeText={setCity} dense />
            <TextInput
              mode="outlined"
              label="Country *"
              value={country}
              onChangeText={setCountry}
              dense
            />
            <View style={styles.manualRow}>
              <NumberField label="Winter PSH" value={winterPsh} onChange={setWinterPsh} unit="h" />
              <NumberField label="Summer PSH" value={summerPsh} onChange={setSummerPsh} unit="h" />
            </View>
            <NumberField label="Recommended tilt" value={tilt} onChange={setTilt} unit="°" />
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={add} disabled={!valid}>
            Add
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  slotCard: {
    marginBottom: 12,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  search: {
    marginBottom: 8,
  },
  list: {
    maxHeight: 260,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  manual: {
    gap: 8,
    paddingTop: 4,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
