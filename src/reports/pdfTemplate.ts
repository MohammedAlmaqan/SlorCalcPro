import type { DesignResult } from '../core/types';
import type { ScenarioRecord } from '../db/repos/projects';
import type { UnitSettings } from '../store/settings';
import { createFormatters } from '../utils/format';
import type { BomItem } from './bom';
import { buildSldDiagram } from './sld';

export interface PdfReportData {
  projectName: string;
  clientName: string;
  scenario: ScenarioRecord;
  result: DesignResult;
  bom: BomItem[];
  units?: UnitSettings;
}

function esc(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render a simplified single-line flow as an HTML table (print-safe). */
function sldHtml(result: DesignResult): string {
  const { input, protection } = result;
  const isOnGrid = input.systemType === 'on-grid';
  const isOffGrid = input.systemType === 'off-grid';

  const blocks: string[] = [];
  blocks.push('<td class="sld source">PV array</td>');
  blocks.push(`<td class="sld protect">PV OCPD ${protection.pvSourceOcpdStandardA} A</td>`);
  blocks.push(
    `<td class="sld protect">DC isolator ${protection.dcIsolatorRequired ? '' : '(opt)'}</td>`,
  );
  if (isOffGrid) blocks.push('<td class="sld convert">Charge controller</td>');
  blocks.push(`<td class="sld protect">SPD ${protection.spdType}</td>`);
  blocks.push('<td class="sld convert">Inverter</td>');
  blocks.push(`<td class="sld protect">AC brkr ${protection.acBreakerStandardA} A</td>`);
  if (protection.acIsolatorRequired) blocks.push('<td class="sld protect">AC isolator</td>');
  blocks.push('<td class="sld load">Main panel / loads</td>');
  if (!isOnGrid) blocks.push('<td class="sld battery">Battery bank ⇄ Inverter</td>');
  else {
    if (protection.atsRequired) blocks.push('<td class="sld protect">ATS</td>');
    blocks.push('<td class="sld grid">Grid</td>');
  }

  return `
    <table class="sld-table"><tr>
      ${blocks.map((block, i) => `${i > 0 ? '<td class="sld-arrow">→</td>' : ''}${block}`).join('')}
    </tr></table>`;
}

/** Build the print-ready HTML document for a design summary PDF. */
export function buildPdfHtml(data: PdfReportData): string {
  const { projectName, clientName, scenario, result, bom, units } = data;
  const { dailyLoad, pv, battery, inverter, controller, cables, protection } = result;
  const f = createFormatters(units ?? { power: 'w', length: 'm', cable: 'mm2', temp: 'c' });
  const systemVoltage = battery.systemVoltageV;

  const loadRows = scenario.loads
    .map(
      (load) => `
      <tr>
        <td>${esc(load.name)}</td>
        <td>${load.quantity}</td>
        <td>${load.powerWatts}</td>
        <td>${load.hoursPerDay}</td>
        <td>${load.isAc ? 'AC' : 'DC'}</td>
        <td>${load.quantity * load.powerWatts * load.hoursPerDay}</td>
      </tr>`,
    )
    .join('');

  const warningRows = result.warnings
    .map(
      (w) => `
      <tr>
        <td class="sev-${w.severity}">${esc(w.severity)}</td>
        <td>${esc(w.message)}</td>
        <td>${esc(w.standard ?? w.code)}</td>
      </tr>`,
    )
    .join('');

  const bomRows = bom
    .map(
      (item) => `
      <tr>
        <td>${esc(item.category)}</td>
        <td>${esc(item.part)}</td>
        <td>${esc(item.spec)}</td>
        <td class="num">${item.qty}</td>
        <td>${esc(item.unit)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Roboto, Arial, sans-serif; color: #131c20; margin: 24px; font-size: 12px; }
  .brand { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #f5a623; padding-bottom: 10px; margin-bottom: 14px; }
  .logo { width: 40px; height: 40px; border-radius: 8px; background: #0b4f6c; color: #fff; font-weight: 800; font-size: 20px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 18px; font-weight: 800; color: #0b4f6c; }
  .brand-tag { font-size: 10px; color: #555; }
  h1 { font-size: 20px; margin: 0 0 2px; color: #0b4f6c; }
  h2 { font-size: 14px; margin: 20px 0 8px; color: #0b4f6c; border-bottom: 2px solid #f5a623; padding-bottom: 4px; }
  .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #cfd8dd; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #e5edf1; }
  td.num { text-align: right; }
  .grid { display: flex; flex-wrap: wrap; }
  .grid > div { flex: 1 1 45%; }
  .stat { background: #f2f7f9; padding: 8px; margin: 4px; }
  .stat .lbl { font-size: 10px; color: #555; }
  .stat .val { font-size: 16px; font-weight: 700; }
  .sev-error { color: #b3261e; font-weight: 700; text-transform: uppercase; }
  .sev-warning { color: #c77d00; font-weight: 700; text-transform: uppercase; }
  .sev-info { color: #1b7f4b; text-transform: uppercase; }
  .sld-table { border: none; }
  .sld-table td { border: none; padding: 3px; text-align: center; }
  .sld { border-radius: 6px; padding: 8px 10px; font-weight: 700; font-size: 10px; color: #fff; }
  .sld.source { background: #0b4f6c; }
  .sld.protect { background: #7d5a1a; }
  .sld.convert { background: #1b7f4b; }
  .sld.load { background: #3f4850; }
  .sld.battery { background: #8d4a9b; }
  .sld.grid { background: #6f7c84; }
  .sld-arrow { font-size: 16px; color: #0b4f6c; }
  .footer { margin-top: 24px; font-size: 9px; color: #999; }
</style>
</head>
<body>
  <div class="brand">
    <div class="logo">S</div>
    <div>
      <div class="brand-name">SlorCalcPro</div>
      <div class="brand-tag">Offline solar system design &amp; engineering report</div>
    </div>
  </div>
  <h1>Solar System Design Summary</h1>
  <div class="meta">
    Project: <b>${esc(projectName)}</b>${clientName ? ` &nbsp;·&nbsp; Client: <b>${esc(clientName)}</b>` : ''}<br />
    Scenario: <b>${esc(scenario.name)}</b> &nbsp;·&nbsp; ${scenario.systemType} · ${systemVoltage} V ·
    ${scenario.chemistry} · ${scenario.autonomyDays} d autonomy · Generated ${new Date().toLocaleString()}
  </div>

  <h2>1. System overview</h2>
  <div class="grid">
    <div class="stat"><div class="lbl">Daily energy demand</div><div class="val">${f.power(dailyLoad.totalWhPerDay)}/day</div></div>
    <div class="stat"><div class="lbl">Peak simultaneous load</div><div class="val">${f.power(dailyLoad.peakSimultaneousWatts)}</div></div>
    <div class="stat"><div class="lbl">PV array</div><div class="val">${f.power(pv.actualArrayWatts)}</div><div class="lbl">${pv.seriesCount}S × ${pv.parallelCount}P</div></div>
    <div class="stat"><div class="lbl">Battery bank</div><div class="val">${f.number(battery.actualCapacityAh, 0)} Ah</div><div class="lbl">${battery.batteryCount} cells @ ${systemVoltage} V</div></div>
    <div class="stat"><div class="lbl">Inverter</div><div class="val">${f.power(inverter.selectedContinuousWatts ?? inverter.recommendedContinuousWatts)}</div><div class="lbl">surge ${f.power(inverter.recommendedSurgeWatts)}</div></div>
    <div class="stat"><div class="lbl">Charge controller</div><div class="val">${controller.selectedCurrentA ?? controller.minCurrentA} A</div><div class="lbl">${controller.recommendedType}</div></div>
  </div>

  <h2>2. Single-line diagram</h2>
  ${sldHtml(result)}

  <h2>3. Load audit</h2>
  <table>
    <tr><th>Appliance</th><th>Qty</th><th>W</th><th>h/day</th><th>AC/DC</th><th>Wh/day</th></tr>
    ${loadRows}
    <tr><th colspan="5">Total</th><th>${f.number(dailyLoad.totalWhPerDay, 0)}</th></tr>
  </table>

  <h2>4. Electrical summary</h2>
  <table>
    <tr><th>Item</th><th>Value</th></tr>
    <tr><td>System voltage</td><td>${systemVoltage} V</td></tr>
    <tr><td>PV source current</td><td>${f.number(cables.pvSource.currentA, 1)} A</td></tr>
    <tr><td>PV source cable</td><td>${f.cableSize(cables.pvSource.crossSectionMm2)} · ${f.number(cables.pvSource.voltageDropPercent, 2)}% drop</td></tr>
    <tr><td>DC output cable</td><td>${f.cableSize(cables.dcOutput.crossSectionMm2)} · ${f.number(cables.dcOutput.voltageDropPercent, 2)}% drop</td></tr>
    <tr><td>AC output cable</td><td>${f.cableSize(cables.acOutput.crossSectionMm2)} · ${f.number(cables.acOutput.voltageDropPercent, 2)}% drop</td></tr>
    <tr><td>PV source OCPD</td><td>${protection.pvSourceOcpdStandardA} A</td></tr>
    <tr><td>AC breaker</td><td>${protection.acBreakerStandardA} A</td></tr>
    <tr><td>Backfeed rule (120%)</td><td>${protection.backfeedPasses ? 'PASS' : 'FAIL'}</td></tr>
    <tr><td>SPD</td><td>${protection.spdType}</td></tr>
  </table>

  ${
    result.warnings.length > 0
      ? `
  <h2>5. Checks &amp; warnings</h2>
  <table>
    <tr><th>Severity</th><th>Message</th><th>Standard</th></tr>
    ${warningRows}
  </table>`
      : '<h2>5. Checks &amp; warnings</h2><p>No warnings — design passes all checks.</p>'
  }

  <h2>6. Bill of materials</h2>
  <table>
    <tr><th>Category</th><th>Part</th><th>Specification</th><th>Qty</th><th>Unit</th></tr>
    ${bomRows}
  </table>

  <div class="footer">
    Generated offline by SlorCalcPro. Engineering reference data should be verified against manufacturer datasheets.
    Calculations per NEC 690/705 and IEC 62548.
  </div>
</body>
</html>`;
}

export { buildSldDiagram };
