import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Menu,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScenarioRecord } from '@/db/repos/projects';
import { useProjectStore } from '@/store/projects';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const project = useProjectStore((s) => s.activeProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const setActiveScenario = useProjectStore((s) => s.setActiveScenario);
  const deleteScenario = useProjectStore((s) => s.deleteScenario);
  const addScenario = useProjectStore((s) => s.addScenario);
  const rename = useProjectStore((s) => s.rename);
  const remove = useProjectStore((s) => s.remove);

  const [projectMenu, setProjectMenu] = useState(false);
  const [renameDialog, setRenameDialog] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [scenarioMenu, setScenarioMenu] = useState<string | null>(null);
  const [deletingScenario, setDeletingScenario] = useState<ScenarioRecord | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id) loadProject(id).catch((e) => console.error('Failed to load project', e));
    }, [id, loadProject]),
  );

  const openRename = () => {
    setProjectMenu(false);
    setRenameName(project?.name ?? '');
    setRenameDialog(true);
  };

  const confirmRename = async () => {
    if (!id || !renameName.trim()) return;
    await rename(id, { name: renameName.trim() });
    setRenameDialog(false);
  };

  const confirmDeleteScenario = async () => {
    if (!deletingScenario) return;
    await deleteScenario(deletingScenario.id);
    setDeletingScenario(null);
  };

  const confirmDeleteProject = async () => {
    if (!id) return;
    await remove(id);
    setDeletingProject(false);
    router.back();
  };

  const renderScenario = (scenario: ScenarioRecord) => {
    const isActive = scenario.isActive;
    const result = scenario.designResult;
    return (
      <Card
        key={scenario.id}
        mode={isActive ? 'contained' : 'outlined'}
        style={styles.scenarioCard}
        onPress={() => router.push(`/project/scenario/${scenario.id}`)}
      >
        <Card.Title
          title={
            <View style={styles.titleRow}>
              <Text variant="titleMedium">{scenario.name}</Text>
              {isActive ? <Badge>Active</Badge> : null}
            </View>
          }
          subtitle={
            result
              ? `${Math.round(result.pv.actualArrayWatts)} W array · ${Math.round(result.dailyLoad.totalWhPerDay)} Wh/day`
              : 'Not designed yet'
          }
          right={() => (
            <Menu
              visible={scenarioMenu === scenario.id}
              onDismiss={() => setScenarioMenu(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setScenarioMenu(scenario.id)}
                  accessibilityLabel="Scenario actions"
                />
              }
            >
              {!isActive ? (
                <Menu.Item
                  leadingIcon="check"
                  title="Set active"
                  onPress={() => {
                    setScenarioMenu(null);
                    setActiveScenario(scenario.id).catch((e) => console.error(e));
                  }}
                />
              ) : null}
              <Menu.Item
                leadingIcon="pencil-outline"
                title="Edit design"
                onPress={() => {
                  setScenarioMenu(null);
                  router.push(`/project/scenario/${scenario.id}`);
                }}
              />
              <Menu.Item
                leadingIcon="delete-outline"
                title="Delete"
                onPress={() => {
                  setScenarioMenu(null);
                  setDeletingScenario(scenario);
                }}
              />
            </Menu>
          )}
        />
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {scenario.systemType} · {scenario.chemistry} · {scenario.systemVoltageV ?? 'auto'} V ·{' '}
            {scenario.loads.length} loads
            {scenario.pshLocation ? ` · ${scenario.pshLocation.city}` : ''}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (!project) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={project.name} />
        <Menu
          visible={projectMenu}
          onDismiss={() => setProjectMenu(false)}
          anchor={<Appbar.Action icon="dots-vertical" onPress={() => setProjectMenu(true)} />}
        >
          <Menu.Item leadingIcon="pencil-outline" title="Rename" onPress={openRename} />
          <Menu.Item
            leadingIcon="delete-outline"
            title="Delete project"
            onPress={() => {
              setProjectMenu(false);
              setDeletingProject(true);
            }}
          />
        </Menu>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {project.clientName ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Client: {project.clientName}
          </Text>
        ) : null}

        <View style={styles.scenarioHeader}>
          <Text variant="titleMedium">Scenarios</Text>
          <Button
            icon="plus"
            mode="text"
            onPress={() => addScenario().catch((e) => console.error(e))}
          >
            Add scenario
          </Button>
        </View>

        {project.scenarios.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No scenarios yet. Add one to run a design.
          </Text>
        ) : (
          project.scenarios.map(renderScenario)
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={renameDialog} onDismiss={() => setRenameDialog(false)}>
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
            <Button onPress={() => setRenameDialog(false)}>Cancel</Button>
            <Button onPress={confirmRename} disabled={!renameName.trim()}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deletingScenario !== null} onDismiss={() => setDeletingScenario(null)}>
          <Dialog.Title>Delete scenario?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              &ldquo;{deletingScenario?.name}&rdquo; and its loads will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeletingScenario(null)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={confirmDeleteScenario}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deletingProject} onDismiss={() => setDeletingProject(false)}>
          <Dialog.Title>Delete project?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              &ldquo;{project.name}&rdquo; and all its scenarios will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeletingProject(false)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={confirmDeleteProject}>
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
  content: {
    padding: 16,
    gap: 8,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  scenarioCard: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
