import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

export function StepHeader(props: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
        Step {props.step} of {props.total}
      </Text>
      <Text variant="headlineSmall">{props.title}</Text>
      {props.subtitle ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {props.subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function StepNav(props: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
}) {
  return (
    <View style={styles.nav}>
      {props.onBack ? (
        <Button
          mode="outlined"
          onPress={props.onBack}
          disabled={props.busy}
          style={styles.navButton}
        >
          {props.backLabel ?? 'Back'}
        </Button>
      ) : null}
      <Button
        mode="contained"
        onPress={props.onNext}
        disabled={props.nextDisabled}
        loading={props.busy}
        style={styles.navButton}
      >
        {props.nextLabel ?? 'Next'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 16,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
  },
});
