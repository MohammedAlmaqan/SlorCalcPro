import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Card, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const necSections = [
  {
    code: 'NEC 690.7',
    title: 'Maximum voltage (worst-cold Voc)',
    body: 'Array open-circuit voltage is derated for the coldest expected ambient temperature using the panel temperature coefficient. The cold Voc must stay below the inverter/charge-controller maximum PV input voltage.',
  },
  {
    code: 'NEC 690.8',
    title: 'Current sizing',
    body: 'PV source-circuit current is computed as Isc × 1.25 (irradiance) × 1.25 (continuous) = Isc × 1.56. Conductors and OCPDs are rated for at least this current.',
  },
  {
    code: 'NEC 690.9',
    title: 'Overcurrent protection',
    body: 'The PV source OCPD rating must not exceed the panel maximum series fuse rating, protecting each parallel string from reverse-current faults.',
  },
  {
    code: 'NEC 705.12(B)',
    title: '120% backfeed rule',
    body: 'For interconnected systems, the main breaker rating plus the PV supply breaker must not exceed 120% of the panelboard busbar rating.',
  },
  {
    code: 'NEC 705.14',
    title: 'Inverter capacity',
    body: 'Inverter continuous power must cover the peak simultaneous AC load (with surge handled by the inverter surge rating for inductive loads).',
  },
];

const iecSections = [
  {
    code: 'IEC 62548',
    title: 'Voltage drop limits',
    body: 'PV source circuits are limited to a maximum voltage drop (default 2%) and AC output circuits to a separate limit (default 3%). The engine sizes conductors to the nearest standard cross-section that meets both the ampacity and voltage-drop requirements.',
  },
  {
    code: 'IEC 62548',
    title: 'Conductor ampacity',
    body: 'Cable ampacity is derated for ambient temperature and installation conditions; the design current after derating must be below the conductor rating.',
  },
];

const formulaCards = [
  {
    title: 'Load audit',
    body: 'Daily energy = Σ (quantity × watts × hours/day). Peak simultaneous load = Σ watts of loads marked as running together, used to size the inverter.',
  },
  {
    title: 'PV array',
    body: 'Array watts = daily energy / (winter PSH × system efficiency). Series/parallel config is chosen so cold Voc stays within limits and MPPT voltage is respected.',
  },
  {
    title: 'Battery bank',
    body: 'Capacity (Ah) = daily energy / (voltage × DoD × inverter efficiency) × autonomy days. Cells are arranged in series/parallel to reach the system voltage and capacity.',
  },
  {
    title: 'Cables',
    body: 'Cross-section is selected from standard sizes so ampacity ≥ design current (after derating) and voltage drop stays within the IEC 62548 limits.',
  },
  {
    title: 'Protection',
    body: 'PV source OCPD = Isc × 1.56 rounded up to the standard size; AC breaker is sized for inverter output current; SPD, isolators and ATS are included per system type.',
  },
];

export default function DocsScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Engineering reference" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              How the engine sizes your system
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              All calculations run offline. Sizing follows NEC 690/705 for North American
              conventions and IEC 62548 for conductor and array-safety requirements. Verify hardware
              against manufacturer datasheets before purchase.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <Card.Title title="Formulas used" titleVariant="titleMedium" />
          <Divider />
          {formulaCards.map((item) => (
            <Card.Content key={item.title}>
              <Text variant="labelLarge">{item.title}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.body}
              </Text>
            </Card.Content>
          ))}
        </Card>

        <Card mode="outlined">
          <Card.Title title="NEC 690 / 705 checks" titleVariant="titleMedium" />
          <Divider />
          {necSections.map((section) => (
            <Card.Content key={section.code}>
              <View style={styles.codeRow}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  {section.code}
                </Text>
                <Text variant="labelMedium">{section.title}</Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.body}
              </Text>
            </Card.Content>
          ))}
        </Card>

        <Card mode="outlined">
          <Card.Title title="IEC 62548 checks" titleVariant="titleMedium" />
          <Divider />
          {iecSections.map((section) => (
            <Card.Content key={`${section.code}-${section.title}`}>
              <View style={styles.codeRow}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  {section.code}
                </Text>
                <Text variant="labelMedium">{section.title}</Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.body}
              </Text>
            </Card.Content>
          ))}
        </Card>

        <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
          Reference data (panels, inverters, batteries, controllers, PSH) is seed data for
          engineering guidance and is fully editable in the Catalog tab.
        </Text>
      </ScrollView>
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
  subtitle: {
    marginTop: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  footer: {
    textAlign: 'center',
    marginTop: 8,
  },
});
