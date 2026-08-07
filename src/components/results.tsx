import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, List, Text, useTheme } from 'react-native-paper';

import type { AuditStep, Severity, Warning } from '@/core/types';

import type { IconName } from './form';

export function SectionTitle(props: { title: string; icon?: IconName }) {
  return (
    <View style={styles.sectionTitle}>
      {props.icon ? <MaterialCommunityIcons name={props.icon} size={20} color="gray" /> : null}
      <Text variant="titleMedium">{props.title}</Text>
    </View>
  );
}

export function KeyValueRow(props: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.kvRow}>
      <Text variant="bodyMedium" style={styles.kvLabel}>
        {props.label}
      </Text>
      <Text variant={props.strong ? 'titleSmall' : 'bodyMedium'} style={styles.kvValue}>
        {props.value}
      </Text>
    </View>
  );
}

export function StatCard(props: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <Card
      mode="contained"
      style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      <Card.Content>
        {props.icon ? (
          <MaterialCommunityIcons
            name={props.icon}
            size={18}
            color={theme.colors.primary}
            style={styles.statIcon}
          />
        ) : null}
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {props.label}
        </Text>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
          {props.value}
          {props.unit ? <Text variant="bodySmall"> {props.unit}</Text> : null}
        </Text>
        {props.hint ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {props.hint}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const severityColors: Record<Severity, string> = {
  info: '#4A90D9',
  warning: '#F5A623',
  error: '#B3261E',
};

const severityIcons: Record<Severity, IconName> = {
  info: 'information-outline',
  warning: 'alert-outline',
  error: 'alert-circle-outline',
};

export function WarningsList(props: { warnings: Warning[] }) {
  const { warnings } = props;
  const errors = warnings.filter((w) => w.severity === 'error').length;
  const icon: IconName =
    errors > 0 ? 'alert-circle' : warnings.length > 0 ? 'alert' : 'check-circle';
  const color =
    errors > 0 ? severityColors.error : warnings.length > 0 ? severityColors.warning : '#1B7F4B';

  return (
    <Card mode="outlined">
      <List.Item
        title={`${warnings.length} check${warnings.length === 1 ? '' : 's'} · ${errors} error${errors === 1 ? '' : 's'}`}
        left={() => <List.Icon icon={icon} color={color} />}
      />
      {warnings.length > 0 ? <Divider /> : null}
      {warnings.map((warning, index) => (
        <List.Item
          key={`${warning.code}-${index}`}
          title={warning.message}
          description={warning.standard ? `Standard: ${warning.standard}` : warning.code}
          left={() => (
            <List.Icon
              icon={severityIcons[warning.severity]}
              color={severityColors[warning.severity]}
            />
          )}
        />
      ))}
    </Card>
  );
}

export function AuditTrailList(props: { steps: AuditStep[] }) {
  const { steps } = props;
  return (
    <View style={styles.audit}>
      {steps.map((step) => (
        <Card key={step.id} mode="outlined" style={styles.auditCard}>
          <Card.Content>
            <Text variant="labelLarge">{step.description}</Text>
            <Text variant="bodySmall">{step.formula}</Text>
            <View style={styles.kvRow}>
              <Text variant="bodySmall" style={styles.kvLabel}>
                Result
              </Text>
              <Text variant="titleSmall">
                {step.result}
                {step.unit ? ` ${step.unit}` : ''}
              </Text>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: 2,
    gap: 16,
  },
  kvLabel: {
    flex: 1,
    color: '#6F7C84',
  },
  kvValue: {
    textAlign: 'right',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statIcon: {
    marginBottom: 4,
  },
  audit: {
    gap: 8,
  },
  auditCard: {
    marginBottom: 8,
  },
});
