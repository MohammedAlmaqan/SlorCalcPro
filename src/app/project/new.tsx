import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesignWizard } from '@/components/DesignWizard';

export default function NewProjectScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="New project" />
      </Appbar.Header>
      <DesignWizard
        mode="create"
        onSaved={(projectId) => router.replace(`/project/${projectId}`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
