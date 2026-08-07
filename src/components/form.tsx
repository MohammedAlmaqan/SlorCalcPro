import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

/** Numeric input that keeps a raw string while typing but reports `number | null`. */
export function NumberField(props: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  decimals?: number;
}) {
  const { label, value, onChange, unit, helperText, error, disabled, decimals = 2 } = props;
  const [text, setText] = useState(value === null ? '' : String(value));
  const [focused, setFocused] = useState(false);

  const display = focused ? text : value === null ? '' : String(value);

  const commit = (raw: string) => {
    setText(raw);
    const cleaned = raw.replace(',', '.').trim();
    if (cleaned === '') {
      onChange(null);
      return;
    }
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) {
      const factor = 10 ** decimals;
      onChange(Math.round(parsed * factor) / factor);
    }
  };

  return (
    <View style={styles.field}>
      <TextInput
        mode="outlined"
        label={label}
        value={display}
        onChangeText={commit}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        keyboardType="numeric"
        disabled={disabled}
        error={error}
        right={unit ? <TextInput.Affix text={unit} /> : undefined}
        dense
      />
      {helperText ? <HelperText type={error ? 'error' : 'info'}>{helperText}</HelperText> : null}
    </View>
  );
}

/** Integer stepper (e.g. quantity). */
export function StepperField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const { label, value, onChange, min = 1, max = 999, disabled } = props;
  return (
    <View style={[styles.stepper, disabled && styles.disabled]}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <IconButton
        icon="minus"
        mode="outlined"
        disabled={disabled || value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <Text variant="titleMedium" style={styles.stepperValue}>
        {value}
      </Text>
      <IconButton
        icon="plus"
        mode="outlined"
        disabled={disabled || value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}

/** Segmented choice for small enums. */
export function SegmentedField(props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { label, value, options, onChange, disabled } = props;
  return (
    <View style={[styles.field, disabled && styles.disabled]}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={options.map((o) => ({ value: o.value, label: o.label, disabled }))}
        density="small"
      />
    </View>
  );
}

/** Binary toggle (yes/no) rendered as a compact segmented control. */
export function ToggleField(props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: string;
}) {
  const { label, value, onChange, disabled, icon } = props;
  return (
    <View style={[styles.field, disabled && styles.disabled]}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <SegmentedButtons
        value={value ? 'yes' : 'no'}
        onValueChange={(v) => onChange(v === 'yes')}
        buttons={[
          { value: 'yes', label: 'Yes', icon, disabled },
          { value: 'no', label: 'No', disabled },
        ]}
        density="small"
      />
    </View>
  );
}

/** Compact icon button used for destructive/remove actions in rows. */
export function RowActionButton(props: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <IconButton
      icon={props.icon}
      onPress={props.onPress}
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      iconColor={theme.colors.error}
      size={20}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 8,
  },
  label: {
    marginBottom: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepperLabel: {
    flex: 1,
  },
  stepperValue: {
    minWidth: 40,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
