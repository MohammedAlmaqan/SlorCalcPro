import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  FAB,
  IconButton,
  Menu,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ProjectRecord } from '@/db/repos/projects';
import { useProjectStore } from '@/store/projects';

export default function ProjectsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loading);
  const refresh = useProjectStore((s) => s.refresh);
  const duplicate = useProjectStore((s) => s.duplicate);
  const remove = useProjectStore((s) => s.remove);
  const rename = useProjectStore((s) => s.rename);

  const [renaming, setRenaming] = useState<ProjectRecord | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleting, setDeleting] = useState<ProjectRecord | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh().catch((e) => console.error('Failed to load projects', e));
    }, [refresh]),
  );

  const openRename = (project: ProjectRecord) => {
    setMenuFor(null);
    setRenameName(project.name);
    setRenaming(project);
  };

  const confirmRename = async () => {
    if (!renaming) return;
    if (renameName.trim()) await rename(renaming.id, { name: renameName.trim() });
    setRenaming(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await remove(deleting.id);
    setDeleting(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Projects" />
      </Appbar.Header>

      {projects.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text variant="titleMedium">No projects yet</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Create a project to run your first solar system design.
          </Text>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push('/project/new')}
            style={styles.emptyButton}
          >
            New project
          </Button>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          onRefresh={refresh}
          refreshing={loading}
          renderItem={({ item }) => (
            <Card
              mode="outlined"
              style={styles.card}
              onPress={() => router.push(`/project/${item.id}`)}
            >
              <Card.Title
                title={item.name}
                subtitle={
                  item.clientName
                    ? `${item.clientName} · updated ${new Date(item.updatedAt).toLocaleDateString()}`
                    : `Updated ${new Date(item.updatedAt).toLocaleDateString()}`
                }
                right={() => (
                  <Menu
                    visible={menuFor === item.id}
                    onDismiss={() => setMenuFor(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        onPress={() => setMenuFor(item.id)}
                        accessibilityLabel="Project actions"
                      />
                    }
                  >
                    <Menu.Item
                      leadingIcon="content-duplicate"
                      title="Duplicate"
                      onPress={() => {
                        setMenuFor(null);
                        duplicate(item.id).catch((e) => console.error(e));
                      }}
                    />
                    <Menu.Item
                      leadingIcon="pencil-outline"
                      title="Rename"
                      onPress={() => openRename(item)}
                    />
                    <Menu.Item
                      leadingIcon="delete-outline"
                      title="Delete"
                      onPress={() => {
                        setMenuFor(null);
                        setDeleting(item);
                      }}
                    />
                  </Menu>
                )}
              />
            </Card>
          )}
        />
      )}

      <FAB
        icon="plus"
        label="New project"
        style={styles.fab}
        onPress={() => router.push('/project/new')}
      />

      <Portal>
        <Dialog visible={renaming !== null} onDismiss={() => setRenaming(null)}>
          <Dialog.Title>Rename project</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Project name"
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRenaming(null)}>Cancel</Button>
            <Button onPress={confirmRename} disabled={!renameName.trim()}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleting !== null} onDismiss={() => setDeleting(null)}>
          <Dialog.Title>Delete project?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              &ldquo;{deleting?.name}&rdquo; and all its scenarios will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleting(null)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={confirmDelete}>
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
  list: {
    padding: 16,
    paddingBottom: 96,
    gap: 8,
  },
  card: {
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  emptyButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
