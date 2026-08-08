import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  FAB,
  IconButton,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogEditor } from '@/components/CatalogEditor';
import { specSummary } from '@/components/pickers';
import type { AnySpec } from '@/db/repos/catalog';
import type { ComponentRecord, ComponentKind } from '@/data/types';
import { useCatalogStore } from '@/store/catalog';

const KINDS: ComponentKind[] = ['panel', 'inverter', 'battery', 'controller', 'cable'];
const KIND_LABELS: Record<ComponentKind, string> = {
  panel: 'Panels',
  inverter: 'Inverters',
  battery: 'Batteries',
  controller: 'Controllers',
  cable: 'Cables',
};

export default function CatalogScreen() {
  const theme = useTheme();
  const lists = useCatalogStore((s) => s.lists);
  const loadKind = useCatalogStore((s) => s.loadKind);
  const search = useCatalogStore((s) => s.search);
  const toggleFavorite = useCatalogStore((s) => s.toggleFavorite);
  const remove = useCatalogStore((s) => s.remove);

  const [kind, setKind] = useState<ComponentKind>('panel');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ComponentRecord<AnySpec> | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ComponentRecord<AnySpec> | null>(null);
  const [saving, setSaving] = useState(false);

  const items = lists[kind] ?? [];

  useEffect(() => {
    const q = query.trim();
    if (q === '') {
      loadKind(kind).catch((e) => console.error(`Load ${kind} failed`, e));
    } else {
      search(kind, q).catch((e) => console.error(`Search ${kind} failed`, e));
    }
  }, [kind, query, loadKind, search]);

  const persistSave = useCallback(
    async (brand: string, model: string, spec: AnySpec) => {
      setSaving(true);
      try {
        const { catalogRepo } = await import('@/db/repos/catalog');
        const { getDbService } = await import('@/store/dbService');
        const repo = catalogRepo(getDbService());
        if (editing) {
          await repo.update(kind, editing.id, { brand, model, spec });
        } else {
          await repo.create(kind, brand, model, spec);
        }
        await loadKind(kind);
        setEditing(null);
        setAdding(false);
      } finally {
        setSaving(false);
      }
    },
    [editing, kind, loadKind],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    await remove(kind, deleting.id);
    setDeleting(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Catalog" />
      </Appbar.Header>

      <View style={styles.tabs}>
        <SegmentedButtons
          value={kind}
          onValueChange={(v) => {
            setKind(v as ComponentKind);
            setQuery('');
          }}
          buttons={KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
          density="small"
        />
      </View>

      <Searchbar
        placeholder="Search components…"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card mode="outlined" style={styles.card}>
            <Card.Title
              title={`${item.brand} ${item.model}`}
              titleNumberOfLines={2}
              subtitle={specSummary(kind, item.spec)}
              subtitleNumberOfLines={3}
              right={() => (
                <View style={styles.actions}>
                  <IconButton
                    icon={item.isFavorite ? 'star' : 'star-outline'}
                    iconColor={theme.colors.secondary}
                    onPress={() =>
                      toggleFavorite(item.id, !item.isFavorite).catch((e) => console.error(e))
                    }
                    accessibilityLabel="Toggle favorite"
                  />
                  <IconButton
                    icon="pencil-outline"
                    onPress={() => setEditing(item)}
                    accessibilityLabel="Edit component"
                  />
                  <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.error}
                    onPress={() => setDeleting(item)}
                    accessibilityLabel="Delete component"
                  />
                </View>
              )}
            />
          </Card>
        )}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            No components. Add one with the button below.
          </Text>
        }
      />

      <FAB icon="plus" label="Add" style={styles.fab} onPress={() => setAdding(true)} />

      <Portal>
        <Dialog
          visible={adding || editing !== null}
          onDismiss={() => {
            setAdding(false);
            setEditing(null);
          }}
          style={styles.dialog}
        >
          <Dialog.ScrollArea>
            <CatalogEditor
              kind={kind}
              initial={editing}
              onSave={persistSave}
              onCancel={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          </Dialog.ScrollArea>
        </Dialog>

        <Dialog visible={deleting !== null} onDismiss={() => setDeleting(null)}>
          <Dialog.Title>Delete component?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              &ldquo;{deleting?.brand} {deleting?.model}&rdquo; will be removed from the catalog.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleting(null)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={confirmDelete} loading={saving}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  search: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 8,
  },
  card: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  empty: {
    textAlign: 'center',
    padding: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialog: {
    maxHeight: '90%',
  },
});
