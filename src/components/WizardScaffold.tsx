import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

export function StepHeader(props: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  const dots = Array.from({ length: props.total }, (_, i) => i + 1);
  return (
    <View style={styles.header}>
      <View style={styles.stepRow}>
        {dots.map((n) => {
          const active = n === props.step;
          const done = n < props.step;
          return (
            <View
              key={n}
              style={[
                styles.dot,
                {
                  backgroundColor: done
                    ? theme.colors.tertiary
                    : active
                      ? theme.colors.secondary
                      : theme.colors.outlineVariant,
                },
              ]}
            />
          );
        })}
      </View>
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
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
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
