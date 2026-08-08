import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

import { ComponentSlot, ManualPshDialog, PshPicker } from '@/components/pickers';
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
  StandardsPolicy,
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
import { useSettingsStore } from '@/store/settings';
import { useUnitFormatters } from '@/hooks/useUnitFormatters';

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
  const [winterPsh, setWinterPsh] = useState<number | null>(initial?.winterPsh ?? null);
  const [summerPsh, setSummerPsh] = useState<number | null>(initial?.summerPsh ?? null);
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
  const [manualPshOpen, setManualPshOpen] = useState(false);

  useEffect(() => {
    if (!reference.loaded) reference.load().catch((e) => console.error('Reference load failed', e));
    const kinds = ['panel', 'inverter', 'battery', 'controller'] as const;
    kinds.forEach((kind) => {
      if (!lists[kind]) loadKind(kind).catch((e) => console.error(`Load ${kind} failed`, e));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from the configured default PSH location in create mode, derived
  // rather than stored so no state is set inside an effect. Explicit user edits
  // (pshLocationId / winterPsh / summerPsh) always win over the default.
  const defaultPshLocationId = useSettingsStore((s) => s.defaultPshLocationId);
  const effectiveLocation = useMemo(() => {
    if (mode !== 'create') return null;
    const id = pshLocationId ?? defaultPshLocationId;
    return reference.psh.find((l) => l.id === id) ?? null;
  }, [mode, pshLocationId, defaultPshLocationId, reference.psh]);
  const effectivePshLocationId = effectiveLocation?.id ?? pshLocationId;
  const effectiveWinterPsh = winterPsh ?? effectiveLocation?.winterPsh ?? 4.0;
  const effectiveSummerPsh = summerPsh ?? effectiveLocation?.summerPsh ?? 6.0;

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

  const standardsPolicy = useSettingsStore((s) => s.standardsPolicy);
  const setStandardsPolicy = useSettingsStore((s) => s.setStandardsPolicy);

  const input = useMemo<SystemInput>(() => {
    return {
      loads,
      systemType,
      winterPsh: effectiveWinterPsh,
      summerPsh: effectiveSummerPsh,
      autonomyDays,
      chemistry,
      systemVoltageOverride: voltage === 'auto' ? undefined : (Number(voltage) as SystemVoltage),
      minTemperatureC: minTemperatureC ?? undefined,
      standardsPolicy,
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
    effectiveWinterPsh,
    effectiveSummerPsh,
    autonomyDays,
    chemistry,
    voltage,
    minTemperatureC,
    standardsPolicy,
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
        minTemperatureC: minTemperatureC ?? -10,
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
        winterPsh: effectiveWinterPsh,
        summerPsh: effectiveSummerPsh,
        pshLocationId: effectivePshLocationId,
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

  const wizardMode = useSettingsStore((s) => s.wizardMode);
  const expert = wizardMode === 'expert';

  const step1 = (
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
  );

  const step2 = (
    <View style={styles.gap}>
      <PshPicker
        locations={reference.psh}
        selectedId={effectivePshLocationId}
        onSelect={(location) => {
          setPshLocationId(location.id);
          setWinterPsh(location.winterPsh);
          setSummerPsh(location.summerPsh);
        }}
        onClear={() => {
          setPshLocationId(null);
        }}
      />
      <Button
        icon="map-marker-plus-outline"
        mode="outlined"
        onPress={() => setManualPshOpen(true)}
        style={styles.suggestButton}
      >
        Add manual location
      </Button>
      <SectionTitle title="Peak sun hours (manual override)" icon="weather-sunny" />
      <View style={styles.row}>
        <NumberField
          label="Winter PSH"
          value={effectiveWinterPsh}
          onChange={setWinterPsh}
          unit="h/day"
        />
        <NumberField
          label="Summer PSH"
          value={effectiveSummerPsh}
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
  );

  const step3 = (
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
  );

  const step4 = (
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
  );

  const step5 = (
    <ResultsView
      result={result}
      error={resultError}
      onAutoSuggest={autoSuggest}
      busy={busy}
      standardsPolicy={standardsPolicy}
      onStandardsPolicyChange={setStandardsPolicy}
    />
  );

  return (
    <View style={styles.container}>
      {!expert ? (
        <StepHeader
          step={step}
          total={WIZARD_STEPS}
          title={STEP_TITLES[step]}
          subtitle={STEP_SUBTITLES[step]}
        />
      ) : null}
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {expert ? (
          <View style={styles.gap}>
            {mode === 'create' ? (
              <SectionTitle title="1 · Project & loads" icon="folder-outline" />
            ) : null}
            {step1}
            <SectionTitle title="2 · Location & solar" icon="weather-sunny" />
            {step2}
            <SectionTitle title="3 · System type" icon="power-plug-outline" />
            {step3}
            <SectionTitle title="4 · Components" icon="wrench-outline" />
            {step4}
            <SectionTitle title="5 · Results" icon="chart-box-outline" />
            {step5}
          </View>
        ) : (
          <>
            {step === 1 ? step1 : null}
            {step === 2 ? step2 : null}
            {step === 3 ? step3 : null}
            {step === 4 ? step4 : null}
            {step === 5 ? step5 : null}
          </>
        )}
      </ScrollView>

      {!expert ? (
        <StepNav
          onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
          onNext={goNext}
          nextLabel={step === WIZARD_STEPS ? (saving ? 'Saving…' : 'Save & finish') : 'Next'}
          nextDisabled={step === 1 ? !step1Valid : step === 5 ? !result : false}
          busy={saving}
        />
      ) : (
        <Button
          mode="contained"
          icon="content-save-outline"
          onPress={save}
          loading={saving}
          disabled={mode === 'create' ? !step1Valid : false}
          style={styles.expertSave}
        >
          Save & finish
        </Button>
      )}

      <ManualPshDialog
        visible={manualPshOpen}
        onDismiss={() => setManualPshOpen(false)}
        onAdd={async (entry) => {
          const location = await reference.addPshManual(entry);
          setPshLocationId(location.id);
          setWinterPsh(location.winterPsh);
          setSummerPsh(location.summerPsh);
        }}
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
  standardsPolicy: StandardsPolicy;
  onStandardsPolicyChange: (policy: StandardsPolicy) => void;
}) {
  const { result, error, onAutoSuggest, busy, standardsPolicy, onStandardsPolicyChange } = props;
  const theme = useTheme();
  const f = useUnitFormatters();
  const powerUnit = useSettingsStore((s) => s.units.power);

  if (error) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
        {error}
      </Text>
    );
  }
  if (!result) return null;

  const { dailyLoad, pv, battery, inverter, controller, cables, protection } = result;
  const useKw = powerUnit === 'kw';

  return (
    <View style={styles.gap}>
      <View style={styles.statRow}>
        <StatCard
          label="Daily energy"
          value={f.number(
            useKw ? dailyLoad.totalWhPerDay / 1000 : dailyLoad.totalWhPerDay,
            useKw ? 2 : 0,
          )}
          unit={useKw ? 'kWh/day' : 'Wh/day'}
          icon="lightning-bolt"
        />
        <StatCard label="Peak load" value={f.power(dailyLoad.peakSimultaneousWatts)} icon="gauge" />
      </View>
      <View style={styles.statRow}>
        <StatCard
          label="PV array"
          value={f.power(pv.actualArrayWatts)}
          hint={`${pv.seriesCount}S × ${pv.parallelCount}P panels`}
          icon="solar-panel"
        />
        <StatCard
          label="Battery bank"
          value={f.number(battery.actualCapacityAh, 0)}
          unit="Ah"
          hint={`${battery.batteryCount} cells · ${f.number(useKw ? battery.actualCapacityKwh : battery.actualCapacityKwh * 1000, useKw ? 2 : 0)} ${useKw ? 'kWh' : 'Wh'}`}
          icon="battery"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          label="Inverter"
          value={f.power(inverter.recommendedContinuousWatts)}
          hint={`Surge ${f.power(inverter.recommendedSurgeWatts)}`}
          icon="transmission-tower"
        />
        <StatCard
          label="Controller"
          value={controller.minCurrentA > 0 ? f.number(controller.minCurrentA, 1) : '—'}
          unit={controller.minCurrentA > 0 ? 'A' : undefined}
          hint={controller.recommendedType}
          icon="cog"
        />
      </View>

      <SectionTitle title="Compliance & warnings" icon="shield-alert-outline" />
      <SegmentedField
        label="Standards policy"
        value={standardsPolicy}
        onChange={(v) => onStandardsPolicyChange(v as StandardsPolicy)}
        options={[
          { value: 'strict', label: 'Strict' },
          { value: 'advisory', label: 'Advisory' },
          { value: 'off', label: 'Off' },
        ]}
      />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {standardsPolicy === 'strict'
          ? 'International codes enforced as-is.'
          : standardsPolicy === 'advisory'
            ? 'Standards checks shown as advisories — local-market components are accepted.'
            : 'Standards checks hidden; engineering safety checks still apply.'}
      </Text>
      <WarningsList warnings={result.warnings} />

      <SectionTitle title="Electrical summary" icon="format-list-bulleted" />
      <Card mode="outlined">
        <Card.Content>
          <KeyValueRow label="System voltage" value={`${battery.systemVoltageV} V`} />
          <KeyValueRow
            label="Array Voc (cold)"
            value={`${f.number(result.compliance.arrayVocColdV, 1)} V`}
            strong
          />
          <KeyValueRow
            label="PV source cable"
            value={`${f.cableSize(cables.pvSource.crossSectionMm2)} · ${f.number(cables.pvSource.voltageDropPercent, 2)}% drop`}
          />
          <KeyValueRow
            label="DC output cable"
            value={`${f.cableSize(cables.dcOutput.crossSectionMm2)} · ${f.number(cables.dcOutput.voltageDropPercent, 2)}% drop`}
          />
          <KeyValueRow
            label="AC output cable"
            value={`${f.cableSize(cables.acOutput.crossSectionMm2)} · ${f.number(cables.acOutput.voltageDropPercent, 2)}% drop`}
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
  expertSave: {
    marginTop: 8,
  },
});
