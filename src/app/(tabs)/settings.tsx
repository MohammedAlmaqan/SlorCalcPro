import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Appbar, Card, Divider, List, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedField } from '@/components/form';
import { PshPicker } from '@/components/pickers';
import { useReferenceStore } from '@/store/reference';
import { useSettingsStore } from '@/store/settings';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const settings = useSettingsStore();
  const psh = useReferenceStore((s) => s.psh);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <View style={styles.container}>
        <Card mode="outlined">
          <Card.Title title="Appearance" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <SegmentedField
              label="Theme"
              value={settings.themeMode}
              onChange={(v) => settings.setThemeMode(v as 'system' | 'light' | 'dark')}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <Card.Title title="Units" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <SegmentedField
              label="Power"
              value={settings.units.power}
              onChange={(v) => settings.setUnits({ power: v as 'w' | 'kw' })}
              options={[
                { value: 'w', label: 'W' },
                { value: 'kw', label: 'kW' },
              ]}
            />
            <SegmentedField
              label="Length"
              value={settings.units.length}
              onChange={(v) => settings.setUnits({ length: v as 'm' | 'ft' })}
              options={[
                { value: 'm', label: 'm' },
                { value: 'ft', label: 'ft' },
              ]}
            />
            <SegmentedField
              label="Cable size"
              value={settings.units.cable}
              onChange={(v) => settings.setUnits({ cable: v as 'mm2' | 'awg' })}
              options={[
                { value: 'mm2', label: 'mm²' },
                { value: 'awg', label: 'AWG' },
              ]}
            />
            <SegmentedField
              label="Temperature"
              value={settings.units.temp}
              onChange={(v) => settings.setUnits({ temp: v as 'c' | 'f' })}
              options={[
                { value: 'c', label: '°C' },
                { value: 'f', label: '°F' },
              ]}
            />
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <Card.Title title="Design defaults" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <PshPicker
              locations={psh}
              selectedId={settings.defaultPshLocationId}
              onSelect={(location) => settings.setDefaultPshLocationId(location.id)}
              onClear={() => settings.setDefaultPshLocationId(null)}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Pre-fills the location step of new designs.
            </Text>
            <SegmentedField
              label="Design mode"
              value={settings.wizardMode}
              onChange={(v) => settings.setWizardMode(v as 'wizard' | 'expert')}
              options={[
                { value: 'wizard', label: 'Wizard' },
                { value: 'expert', label: 'Expert' },
              ]}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Wizard guides you step by step; expert shows every field on one screen.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <Card.Title title="Standards & compliance" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <SegmentedField
              label="Standards policy"
              value={settings.standardsPolicy}
              onChange={(v) => settings.setStandardsPolicy(v as 'strict' | 'advisory' | 'off')}
              options={[
                { value: 'strict', label: 'Strict' },
                { value: 'advisory', label: 'Advisory' },
                { value: 'off', label: 'Off' },
              ]}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Strict enforces international codes (NEC/IEC). Advisory keeps results usable when
              local-market components do not meet every code. Off hides standards checks. Safety
              checks (cable sizing) always remain.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <List.Item
            title="Engineering reference"
            description="NEC 690/705 & IEC 62548 formulas and conventions used by the engine"
            left={() => <List.Icon icon="book-open-variant" color={theme.colors.primary} />}
            onPress={() => router.push('/docs')}
          />
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
