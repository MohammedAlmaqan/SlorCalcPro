import { StyleSheet, View } from 'react-native';
import { Appbar, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenScaffoldProps = {
  title: string;
  module: string;
  description: string;
  phase: string;
};

/**
 * Temporary placeholder used during Phase 0 scaffolding.
 * Replaced by the real module UI in later phases.
 */
export function ScreenScaffold({ title, module, description, phase }: ScreenScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title={title} />
      </Appbar.Header>
      <View style={styles.container}>
        <Card mode="outlined">
          <Card.Title
            title={module}
            subtitle={`Implemented in ${phase}`}
            titleVariant="titleLarge"
          />
          <Card.Content>
            <Text variant="bodyMedium">{description}</Text>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
});
