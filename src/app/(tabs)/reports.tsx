import { useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  Divider,
  List,
  Menu,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScenarioRecord } from '@/db/repos/projects';
import { buildBom } from '@/reports/bom';
import { compareScenarios } from '@/reports/comparison';
import { bomToCsv } from '@/reports/csv';
import { exportProject, parseProjectImport } from '@/reports/jsonIO';
import { buildPdfHtml } from '@/reports/pdfTemplate';
import { buildSldDiagram } from '@/reports/sld';
import { useProjectStore } from '@/store/projects';

import { SldView } from '../../components/SldView';
import { StatCard, WarningsList } from '../../components/results';
import { useUnitFormatters } from '../../hooks/useUnitFormatters';
import { useSettingsStore } from '../../store/settings';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project'
  );
}

export default function ReportsScreen() {
  const theme = useTheme();
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const refresh = useProjectStore((s) => s.refresh);
  const loadProject = useProjectStore((s) => s.loadProject);
  const importProject = useProjectStore((s) => s.importProject);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [projectMenu, setProjectMenu] = useState(false);
  const [scenarioMenu, setScenarioMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [importDialog, setImportDialog] = useState(false);
  const f = useUnitFormatters();
  const units = useSettingsStore((s) => s.units);

  useFocusEffect(
    useCallback(() => {
      refresh().catch((e) => console.error('Failed to load reports data', e));
    }, [refresh]),
  );

  const openProject = useCallback(
    async (id: string) => {
      await loadProject(id);
      setProjectMenu(false);
      setScenarioId(null);
    },
    [loadProject],
  );

  const project = activeProject;
  const scenario = useMemo(
    () => project?.scenarios.find((s) => s.id === scenarioId) ?? project?.scenarios[0] ?? null,
    [project, scenarioId],
  );

  const result = scenario?.designResult ?? null;

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportPdf = async () => {
    if (!project || !scenario || !result) return;
    setBusy(true);
    try {
      const html = buildPdfHtml({
        projectName: project.name,
        clientName: project.clientName,
        scenario,
        result,
        bom: buildBom(result, units),
        units,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share design PDF',
        });
      }
      notify('PDF exported');
    } catch (e) {
      notify('PDF export failed');
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    if (!project || !scenario || !result) return;
    setBusy(true);
    try {
      const file = new File(Paths.cache, `${slugify(project.name)}-bom.csv`);
      file.create({ overwrite: true, intermediates: true });
      file.write(bomToCsv(buildBom(result, units)));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share BOM CSV',
        });
      }
      notify('BOM CSV exported');
    } catch (e) {
      notify('CSV export failed');
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const file = new File(Paths.cache, `${slugify(project.name)}-backup.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(exportProject(project));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Share project backup',
        });
      }
      notify('Project backup exported');
    } catch (e) {
      notify('Backup export failed');
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const importJson = async () => {
    setImportDialog(false);
    setBusy(true);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled || !picked.result) return;
      const parsed = parseProjectImport(picked.result.textSync());
      await importProject(parsed);
      await refresh();
      notify(`Imported "${parsed.project.name}"`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
      setImportDialog(true);
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const compare = useMemo(() => {
    if (!project || project.scenarios.length < 2) return null;
    const { rows, columns } = compareScenarios(project.scenarios);
    return rows.length > 0 && columns.length > 1 ? { rows, columns } : null;
  }, [project]);

  const scenarioOptions = project?.scenarios ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Reports & Export" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {projects.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="titleMedium">No projects yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Create a project and run a design to generate reports.
            </Text>
          </View>
        ) : (
          <>
            <Card mode="outlined" style={styles.selectorCard}>
              <Card.Content>
                <Menu
                  visible={projectMenu}
                  onDismiss={() => setProjectMenu(false)}
                  anchor={
                    <List.Item
                      title={project?.name ?? 'Select project'}
                      description={project ? `${project.scenarios.length} scenario(s)` : undefined}
                      left={() => <List.Icon icon="folder-outline" />}
                      right={() => <List.Icon icon="chevron-down" />}
                      onPress={() => setProjectMenu(true)}
                    />
                  }
                >
                  {projects.map((p) => (
                    <Menu.Item key={p.id} title={p.name} onPress={() => openProject(p.id)} />
                  ))}
                </Menu>
                {scenarioOptions.length > 0 ? (
                  <Menu
                    visible={scenarioMenu}
                    onDismiss={() => setScenarioMenu(false)}
                    anchor={
                      <List.Item
                        title={scenario?.name ?? 'Select scenario'}
                        description={
                          scenario ? `${scenario.systemType} · ${scenario.chemistry}` : undefined
                        }
                        left={() => <List.Icon icon="chart-timeline-variant" />}
                        right={() => <List.Icon icon="chevron-down" />}
                        onPress={() => setScenarioMenu(true)}
                      />
                    }
                  >
                    {scenarioOptions.map((s: ScenarioRecord) => (
                      <Menu.Item
                        key={s.id}
                        title={s.name}
                        onPress={() => {
                          setScenarioId(s.id);
                          setScenarioMenu(false);
                        }}
                      />
                    ))}
                  </Menu>
                ) : null}
              </Card.Content>
            </Card>

            {!result ? (
              <Card mode="outlined" style={styles.emptyCard}>
                <Card.Content>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {scenario
                      ? 'This scenario has no design result yet. Run the design in the wizard first.'
                      : 'Select a scenario to view its design.'}
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <StatCard label="Daily load" value={f.power(result.dailyLoad.totalWhPerDay)} />
                  <StatCard label="PV array" value={f.power(result.pv.actualArrayWatts)} />
                  <StatCard
                    label="Battery"
                    value={f.number(result.battery.actualCapacityAh, 0)}
                    unit="Ah"
                  />
                  <StatCard
                    label="Inverter"
                    value={f.power(
                      result.inverter.selectedContinuousWatts ??
                        result.inverter.recommendedContinuousWatts,
                    )}
                  />
                </View>

                <Card mode="outlined" style={styles.sectionCard}>
                  <Card.Title title="Single-line diagram" />
                  <Card.Content>
                    <SldView diagram={buildSldDiagram(result)} />
                  </Card.Content>
                </Card>

                <View style={styles.sectionCard}>
                  <WarningsList warnings={result.warnings} />
                </View>

                <Card mode="outlined" style={styles.sectionCard}>
                  <Card.Title title="Export" />
                  <Card.Content style={styles.exportGrid}>
                    <Button
                      mode="contained"
                      icon="file-pdf-box"
                      loading={busy}
                      disabled={busy}
                      onPress={exportPdf}
                    >
                      PDF report
                    </Button>
                    <Button
                      mode="outlined"
                      icon="file-delimited-outline"
                      loading={busy}
                      disabled={busy}
                      onPress={exportCsv}
                    >
                      BOM CSV
                    </Button>
                    <Button
                      mode="outlined"
                      icon="database-export-outline"
                      loading={busy}
                      disabled={busy}
                      onPress={exportJson}
                    >
                      JSON backup
                    </Button>
                    <Button
                      mode="outlined"
                      icon="database-import-outline"
                      disabled={busy}
                      onPress={() => setImportDialog(true)}
                    >
                      Restore backup
                    </Button>
                  </Card.Content>
                </Card>
              </>
            )}

            {compare ? (
              <Card mode="outlined" style={styles.sectionCard}>
                <Card.Title title="Scenario comparison" />
                <Card.Content>
                  <View style={styles.tableHeader}>
                    <Text variant="labelLarge" style={styles.metricCell}>
                      Metric
                    </Text>
                    {compare.columns.map((column) => (
                      <Text
                        key={column.id}
                        variant="labelLarge"
                        style={styles.valueCell}
                        numberOfLines={1}
                      >
                        {column.name}
                      </Text>
                    ))}
                  </View>
                  <Divider />
                  {compare.rows.map((row) => (
                    <View key={row.metric} style={styles.tableRow}>
                      <Text variant="bodyMedium" style={styles.metricCell}>
                        {row.metric}
                      </Text>
                      {row.values.map((value, index) => (
                        <Text
                          key={`${row.metric}-${index}`}
                          variant="bodyMedium"
                          style={styles.valueCell}
                        >
                          {value}
                        </Text>
                      ))}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={importDialog} onDismiss={() => setImportDialog(false)}>
          <Dialog.Title>Restore project backup</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {importError || 'Pick a SlorCalcPro JSON backup file to restore it as a new project.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setImportDialog(false)}>Cancel</Button>
            <Button onPress={importJson} icon="file-import-outline">
              Pick file
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>
        {message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  emptyCard: {
    marginTop: 8,
  },
  selectorCard: {
    marginBottom: 4,
  },
  sectionCard: {
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exportGrid: {
    gap: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  metricCell: {
    flex: 1.4,
  },
  valueCell: {
    flex: 1,
    textAlign: 'center',
  },
});
