import { ScreenScaffold } from '@/components/ScreenScaffold';

export default function SettingsScreen() {
  return (
    <ScreenScaffold
      title="Settings"
      module="Settings & Preferences"
      description="Units (W/kW, AWG↔mm², m/ft), engineering defaults, theme and wizard/expert mode."
      phase="Phase 5 (Settings & polish)"
    />
  );
}
