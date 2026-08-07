import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

import { ComponentSlot, PshPicker } from '@/components/pickers';
import { NumberField, SegmentedField, StepperField } from '@/components/form';
import { LoadEditor } from '@/components/LoadEditor';
import { StepHeader, StepNav } from '@/components/WizardScaffold';
import {
  AuditTrailList,
  KeyValueRow,
  SectionTitle,
  StatCard,
  WarningsList,
} from '@/components/results';
import { referenceInverterFor, REFERENCE_CONTROLLER } from '@/core/data/referenceComponents';
import { designSystem } from '@/core/engine';
import type {
  BatteryChemistry,
  BatterySpec,
  ChargeControllerSpec,
  InverterSpec,
  LoadItem,
  PanelSpec,
  SystemInput,
  SystemType,
  SystemVoltage,
} from '@/core/types';
import type { ComponentRecord } from '@/data/types';
import type { ScenarioRecord } from '@/db/repos/projects';
import type { SuggestRequirements } from '@/db/suggest';
import { suggestComponents } from '@/db/suggest';
import { useCatalogStore } from '@/store/catalog';
import { useProjectStore } from '@/store/projects';
import { useReferenceStore } from '@/store/reference';

export const WIZARD_STEPS = 5;

type VoltageChoice = 'auto' | '12' | '24' | '48';

export function DesignWizard(props: {
  mode: 'create' | 'edit';
  initial?: ScenarioRecord;
  onSaved: (projectId: string, scenarioId: string) => void;
}) {
  const { mode, initial, onSaved } = props;
  const theme = useTheme();
  const reference = useReferenceStore();
  const lists = useCatalogStore((s) => s.lists);
  const loadKind = useCatalogStore((s) => s.loadKind);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [loads, setLoads] = useState<LoadItem[]>(initial?.loads ?? []);
  const [systemType, setSystemType] = useState<SystemType>(initial?.systemType ?? 'off-grid');
  const [winterPsh, setWinterPsh] = useState<number | null>(initial?.winterPsh ?? 4.0);
  const [summerPsh, setSummerPsh] = useState<number | null>(initial?.summerPsh ?? 6.0);
  const [pshLocationId, setPshLocationId] = useState<string | null>(
    initial?.pshLocation?.id ?? null,
  );
  const [minTemperatureC, setMinTemperatureC] = useState<number | null>(
    initial?.minTemperatureC ?? -10,
  );
  const [autonomyDays, setAutonomyDays] = useState(initial?.autonomyDays ?? 2);
  const [chemistry, setChemistry] = useState<BatteryChemistry>(initial?.chemistry ?? 'lifepo4');
  const [voltage, setVoltage] = useState<VoltageChoice>(
    initial?.systemVoltageV != null ? (String(initial.systemVoltageV) as VoltageChoice) : 'auto',
  );
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(
    initial?.selectedPanelId ?? null,
  );
  const [selectedInverterId, setSelectedInverterId] = useState<string | null>(
    initial?.selectedInverterId ?? null,
  );
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(
    initial?.selectedBatteryId ?? null,
  );
  const [selectedControllerId, setSelectedControllerId] = useState<string | null>(
    initial?.selectedControllerId ?? null,
  );

  useEffect(() => {
    if (!reference.loaded) reference.load().catch((e) => console.error('Reference load failed', e));
    const kinds = ['panel', 'inverter', 'battery', 'controller'] as const;
    kinds.forEach((kind) => {
      if (!lists[kind]) loadKind(kind).catch((e) => console.error(`Load ${kind} failed`, e));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolved = useMemo<NonNullable<SystemInput['selected']>>(() => {
    const panel = selectedPanelId
      ? (lists.panel?.find((r) => r.id === selectedPanelId)?.spec as PanelSpec | undefined)
      : undefined;
    const inverter = selectedInverterId
      ? (lists.inverter?.find((r) => r.id === selectedInverterId)?.spec as InverterSpec | undefined)
      : undefined;
    const battery = selectedBatteryId
      ? (lists.battery?.find((r) => r.id === selectedBatteryId)?.spec as BatterySpec | undefined)
      : undefined;
    const controller = selectedControllerId
      ? (lists.controller?.find((r) => r.id === selectedControllerId)?.spec as
          ChargeControllerSpec | undefined)
      : undefined;
    return { panel, inverter, battery, controller };
  }, [lists, selectedPanelId, selectedInverterId, selectedBatteryId, selectedControllerId]);

  const input = useMemo<SystemInput>(() => {
    return {
      loads,
      systemType,
      winterPsh: winterPsh ?? 4.0,
      summerPsh: summerPsh ?? 6.0,
      autonomyDays,
      chemistry,
      systemVoltageOverride: voltage === 'auto' ? undefined : (Number(voltage) as SystemVoltage),
      minTemperatureC: minTemperatureC ?? undefined,
      selected: {
        panel: resolved.panel,
        inverter: resolved.inverter,
        battery: resolved.battery,
        controller: resolved.controller,
      },
    };
  }, [
    loads,
    systemType,
    winterPsh,
    summerPsh,
    autonomyDays,
    chemistry,
    voltage,
    minTemperatureC,
    resolved,
  ]);

  const { result, resultError } = useMemo(() => {
    try {
      return { result: designSystem(input), resultError: null as string | null };
    } catch (error) {
      return {
        result: null,
        resultError: error instanceof Error ? error.message : 'Design calculation failed',
      };
    }
  }, [input]);

  const baselineLimits = () => {
    if (systemType === 'off-grid') {
      const c = REFERENCE_CONTROLLER;
      return { min: 48, max: c.maxPvVoltageV, current: c.ratedCurrentA, maxV: c.maxPvVoltageV };
    }
    const inv = referenceInverterFor(systemType);
    return {
      min: inv.mpptVoltageRangeMinV,
      max: inv.mpptVoltageRangeMaxV,
      current: inv.maxPvCurrentA * inv.mpptCount,
      maxV: inv.maxPvVoltageV,
    };
  };

  const autoSuggest = async () => {
    setBusy(true);
    try {
      const baseline = designSystem({ ...input, selected: {} });
      const limits = baselineLimits();
      const req: SuggestRequirements = {
        requiredArrayWatts: baseline.pv.requiredArrayWatts,
        recommendedContinuousWatts: baseline.inverter.recommendedContinuousWatts,
        recommendedSurgeWatts: baseline.inverter.recommendedSurgeWatts,
        systemVoltage: baseline.battery.systemVoltageV,
        systemType,
        chemistry,
        requiredKwh: baseline.battery.requiredKwh,
        controllerMinCurrentA: baseline.controller.minCurrentA,
        controllerMaxPvVoltageRequiredV: baseline.controller.maxPvVoltageRequiredV,
        mpptMinVoltageV: limits.min,
        mpptMaxVoltageV: limits.max,
        maxInputVoltageV: limits.maxV,
      };
      const suggestion = suggestComponents(
        req,
        (lists.panel ?? []) as ComponentRecord<PanelSpec>[],
        (lists.inverter ?? []) as ComponentRecord<InverterSpec>[],
        (lists.battery ?? []) as ComponentRecord<BatterySpec>[],
        (lists.controller ?? []) as ComponentRecord<ChargeControllerSpec>[],
      );
      setSelectedPanelId(suggestion.panelId);
      setSelectedInverterId(suggestion.inverterId);
      setSelectedBatteryId(suggestion.batteryId);
      setSelectedControllerId(suggestion.controllerId);
    } finally {
      setBusy(false);
    }
  };

  const isOnGrid = systemType === 'on-grid';
  const isOffGrid = systemType === 'off-grid';
  const step1Valid = mode === 'edit' || projectName.trim().length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        systemType,
        systemVoltageV: voltage === 'auto' ? null : (Number(voltage) as SystemVoltage),
        chemistry,
        autonomyDays,
        winterPsh: winterPsh ?? 4.0,
        summerPsh: summerPsh ?? 6.0,
        pshLocationId,
        minTemperatureC,
        selectedPanelId,
        selectedInverterId,
        selectedBatteryId,
        selectedControllerId,
        loads,
      };
      let projectId = '';
      let scenarioId = '';
      if (mode === 'create') {
        const project = await useProjectStore.getState().create({
          name: projectName.trim(),
          clientName: clientName.trim() || undefined,
          scenarioName: 'Base design',
          systemType,
          loads,
        });
        projectId = project.id;
        scenarioId = project.scenarios[0].id;
        await useProjectStore.getState().updateScenario(scenarioId, patch);
      } else if (initial) {
        projectId = initial.projectId;
        scenarioId = initial.id;
        await useProjectStore.getState().updateScenario(scenarioId, patch);
      }
      if (result) await useProjectStore.getState().saveDesignResult(scenarioId, result);
      onSaved(projectId, scenarioId);
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step < WIZARD_STEPS) setStep((s) => s + 1);
    else save();
  };

  return (
    <View style={styles.container}>
      <StepHeader
        step={step}
        total={WIZARD_STEPS}
        title={STEP_TITLES[step]}
        subtitle={STEP_SUBTITLES[step]}
      />
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {step === 1 ? (
          <View style={styles.gap}>
            {mode === 'create' ? (
              <>
                <Card mode="outlined">
                  <Card.Content style={styles.gap}>
                    <TextInput
                      mode="outlined"
                      label="Project name *"
                      value={projectName}
                      onChangeText={setProjectName}
                      dense
                    />
                    <TextInput
                      mode="outlined"
                      label="Client name"
                      value={clientName}
                      onChangeText={setClientName}
                      dense
                    />
                  </Card.Content>
                </Card>
                <SectionTitle title="Load audit" icon="format-list-bulleted" />
                <LoadEditor loads={loads} presets={reference.presets} onChangeLoads={setLoads} />
              </>
            ) : (
              <LoadEditor loads={loads} presets={reference.presets} onChangeLoads={setLoads} />
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.gap}>
            <PshPicker
              locations={reference.psh}
              selectedId={pshLocationId}
              onSelect={(location) => {
                setPshLocationId(location.id);
                setWinterPsh(location.winterPsh);
                setSummerPsh(location.summerPsh);
              }}
              onClear={() => {
                setPshLocationId(null);
              }}
            />
            <SectionTitle title="Peak sun hours (manual override)" icon="weather-sunny" />
            <View style={styles.row}>
              <NumberField
                label="Winter PSH"
                value={winterPsh}
                onChange={setWinterPsh}
                unit="h/day"
              />
              <NumberField
                label="Summer PSH"
                value={summerPsh}
                onChange={setSummerPsh}
                unit="h/day"
              />
            </View>
            <NumberField
              label="Min. ambient temperature"
              value={minTemperatureC}
              onChange={setMinTemperatureC}
              unit="°C"
              helperText="Used for worst-cold Voc derating (NEC 690.7)."
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.gap}>
            <SegmentedField
              label="System type"
              value={systemType}
              onChange={(v) => setSystemType(v as SystemType)}
              options={[
                { value: 'on-grid', label: 'On-grid' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'off-grid', label: 'Off-grid' },
              ]}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {SYSTEM_TYPE_HELP[systemType]}
            </Text>
            {!isOnGrid ? (
              <>
                <StepperField
                  label="Days of autonomy"
                  value={autonomyDays}
                  onChange={setAutonomyDays}
                  min={1}
                  max={10}
                />
                <SegmentedField
                  label="Battery chemistry"
                  value={chemistry}
                  onChange={(v) => setChemistry(v as BatteryChemistry)}
                  options={[
                    { value: 'lifepo4', label: 'LiFePO4' },
                    { value: 'agm-gel', label: 'AGM/Gel' },
                    { value: 'flooded', label: 'Flooded' },
                  ]}
                />
              </>
            ) : null}
            <SegmentedField
              label="System voltage"
              value={voltage}
              onChange={(v) => setVoltage(v as VoltageChoice)}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '12', label: '12 V' },
                { value: '24', label: '24 V' },
                { value: '48', label: '48 V' },
              ]}
            />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.gap}>
            <Button
              mode="contained-tonal"
              icon="auto-fix"
              onPress={autoSuggest}
              loading={busy}
              style={styles.suggestButton}
            >
              Auto-suggest components
            </Button>
            <ComponentSlot
              kind="panel"
              label="PV panel"
              selectedId={selectedPanelId}
              onSelect={setSelectedPanelId}
              helperText="Minimizes panel count within the MPPT string limits."
            />
            <ComponentSlot
              kind="inverter"
              label="Inverter"
              selectedId={selectedInverterId}
              onSelect={setSelectedInverterId}
              helperText={
                isOnGrid ? 'Grid-tied string inverter.' : 'Must match the battery bank voltage.'
              }
            />
            {!isOnGrid ? (
              <ComponentSlot
                kind="battery"
                label="Battery"
                selectedId={selectedBatteryId}
                onSelect={setSelectedBatteryId}
                helperText={`Matched to ${chemistry} chemistry and ${voltage === 'auto' ? 'recommended' : `${voltage} V`} voltage.`}
              />
            ) : null}
            {isOffGrid ? (
              <ComponentSlot
                kind="controller"
                label="Charge controller"
                selectedId={selectedControllerId}
                onSelect={setSelectedControllerId}
                helperText="MPPT recommended above 200 W array."
              />
            ) : null}
          </View>
        ) : null}

        {step === 5 ? (
          <ResultsView
            result={result}
            error={resultError}
            onAutoSuggest={autoSuggest}
            busy={busy}
          />
        ) : null}
      </ScrollView>

      <StepNav
        onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
        onNext={goNext}
        nextLabel={step === WIZARD_STEPS ? (saving ? 'Saving…' : 'Save & finish') : 'Next'}
        nextDisabled={step === 1 ? !step1Valid : step === 5 ? !result : false}
        busy={saving}
      />
    </View>
  );
}

const STEP_TITLES: Record<number, string> = {
  1: 'Project & loads',
  2: 'Location & solar',
  3: 'System type',
  4: 'Components',
  5: 'Results',
};

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Name the project and list every appliance you will power.',
  2: 'Pick the installation city or enter peak sun hours manually.',
  3: 'Choose how the system connects and its storage settings.',
  4: 'Select hardware from the catalog or let the app suggest.',
  5: 'Review recommendations, warnings and the full audit trail.',
};

const SYSTEM_TYPE_HELP: Record<SystemType, string> = {
  'on-grid': 'Feeds solar into the grid. No battery bank required (grid is the backup).',
  hybrid: 'Battery backup plus grid connection. Runs loads during outages.',
  'off-grid': 'Fully independent with battery storage and a charge controller.',
};

function ResultsView(props: {
  result: ReturnType<typeof designSystem> | null;
  error: string | null;
  onAutoSuggest: () => void;
  busy: boolean;
}) {
  const { result, error, onAutoSuggest, busy } = props;
  const theme = useTheme();

  if (error) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
        {error}
      </Text>
    );
  }
  if (!result) return null;

  const { dailyLoad, pv, battery, inverter, controller, cables, protection } = result;

  return (
    <View style={styles.gap}>
      <View style={styles.statRow}>
        <StatCard
          label="Daily energy"
          value={fmt(dailyLoad.totalWhPerDay)}
          unit="Wh/day"
          icon="lightning-bolt"
        />
        <StatCard
          label="Peak load"
          value={fmt(dailyLoad.peakSimultaneousWatts)}
          unit="W"
          icon="gauge"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          label="PV array"
          value={fmt(pv.actualArrayWatts)}
          unit="W"
          hint={`${pv.seriesCount}S × ${pv.parallelCount}P panels`}
          icon="solar-panel"
        />
        <StatCard
          label="Battery bank"
          value={fmt(battery.actualCapacityAh)}
          unit="Ah"
          hint={`${battery.batteryCount} cells · ${fmt(battery.actualCapacityKwh)} kWh`}
          icon="battery"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          label="Inverter"
          value={fmt(inverter.recommendedContinuousWatts)}
          unit="W"
          hint={`Surge ${fmt(inverter.recommendedSurgeWatts)} W`}
          icon="transmission-tower"
        />
        <StatCard
          label="Controller"
          value={controller.minCurrentA > 0 ? fmt(controller.minCurrentA) : '—'}
          unit={controller.minCurrentA > 0 ? 'A' : undefined}
          hint={controller.recommendedType}
          icon="cog"
        />
      </View>

      <SectionTitle title="Compliance & warnings" icon="shield-alert-outline" />
      <WarningsList warnings={result.warnings} />

      <SectionTitle title="Electrical summary" icon="format-list-bulleted" />
      <Card mode="outlined">
        <Card.Content>
          <KeyValueRow label="System voltage" value={`${battery.systemVoltageV} V`} />
          <KeyValueRow
            label="Array Voc (cold)"
            value={`${fmt(result.compliance.arrayVocColdV)} V`}
            strong
          />
          <KeyValueRow
            label="PV source cable"
            value={`${cables.pvSource.crossSectionMm2} mm² · ${fmt(cables.pvSource.voltageDropPercent)}% drop`}
          />
          <KeyValueRow
            label="DC output cable"
            value={`${cables.dcOutput.crossSectionMm2} mm² · ${fmt(cables.dcOutput.voltageDropPercent)}% drop`}
          />
          <KeyValueRow
            label="AC output cable"
            value={`${cables.acOutput.crossSectionMm2} mm² · ${fmt(cables.acOutput.voltageDropPercent)}% drop`}
          />
          <KeyValueRow label="PV source OCPD" value={`${protection.pvSourceOcpdStandardA} A`} />
          <KeyValueRow label="AC breaker" value={`${protection.acBreakerStandardA} A`} />
          <KeyValueRow
            label="Backfeed rule"
            value={protection.backfeedPasses ? 'Passes' : 'Fails'}
          />
        </Card.Content>
      </Card>

      <SectionTitle title="Audit trail (show your work)" icon="calculator" />
      <AuditTrailList steps={result.audit} />

      <Button
        icon="auto-fix"
        mode="outlined"
        onPress={onAutoSuggest}
        loading={busy}
        style={styles.suggestButton}
      >
        Re-suggest components
      </Button>
    </View>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  gap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  suggestButton: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
});
