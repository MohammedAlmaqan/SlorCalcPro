import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesignWizard } from '@/components/DesignWizard';
import type { ScenarioRecord } from '@/db/repos/projects';
import { projectRepo } from '@/db/repos/projects';
import { getDbService } from '@/store/dbService';

export default function ScenarioScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) return;
    projectRepo(getDbService())
      .getScenario(scenarioId)
      .then(setScenario)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load scenario'));
  }, [scenarioId]);

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit design" />
        </Appbar.Header>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!scenario) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={scenario.name} />
      </Appbar.Header>
      <DesignWizard mode="edit" initial={scenario} onSaved={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  error: {
    padding: 16,
  },
});
