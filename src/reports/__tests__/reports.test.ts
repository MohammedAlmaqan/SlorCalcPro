import { designSystem } from '../../core/engine';
import type { LoadItem, SystemInput } from '../../core/types';
import type { ProjectWithScenarios } from '../../db/repos/projects';
import { buildBom, groupBom } from '../bom';
import { bomToCsv, csvEscape } from '../csv';
import { exportProject, parseProjectImport } from '../jsonIO';
import { buildPdfHtml } from '../pdfTemplate';
import { buildSldDiagram } from '../sld';
import { compareScenarios } from '../comparison';

function sampleInput(): SystemInput {
  const loads: LoadItem[] = [
    {
      id: 'l1',
      name: 'LED lights',
      quantity: 8,
      powerWatts: 12,
      hoursPerDay: 5,
      isAc: true,
      isSimultaneous: false,
      isInductive: false,
    },
    {
      id: 'l2',
      name: 'Fridge',
      quantity: 1,
      powerWatts: 150,
      hoursPerDay: 10,
      isAc: true,
      isSimultaneous: true,
      isInductive: true,
      surgeFactor: 6,
    },
    {
      id: 'l3',
      name: 'Water pump',
      quantity: 1,
      powerWatts: 750,
      hoursPerDay: 2,
      isAc: true,
      isSimultaneous: true,
      isInductive: true,
      surgeFactor: 5,
    },
  ];
  return {
    loads,
    systemType: 'off-grid',
    winterPsh: 4.0,
    summerPsh: 6.0,
    autonomyDays: 2,
    chemistry: 'lifepo4',
    pvCableLengthM: 8,
    dcCableLengthM: 2,
    acCableLengthM: 10,
  };
}

function sampleResult() {
  return designSystem(sampleInput());
}

function makeScenario(name: string, designResult: ReturnType<typeof sampleResult> | null) {
  return {
    id: `s-${name}`,
    projectId: 'p1',
    name,
    isActive: true,
    systemType: 'off-grid' as const,
    systemVoltageV: 48 as const,
    chemistry: 'lifepo4' as const,
    autonomyDays: 2,
    winterPsh: 4,
    summerPsh: 6,
    pshLocation: null,
    inverterEfficiency: null,
    systemLossFactor: null,
    dcVoltageDropPercent: null,
    acVoltageDropPercent: null,
    minTemperatureC: -10,
    tempDeratingFactor: null,
    pvCableLengthM: 8,
    dcCableLengthM: 2,
    acCableLengthM: 10,
    busbarRatingA: null,
    mainBreakerA: null,
    selectedPanelId: null,
    selectedInverterId: null,
    selectedBatteryId: null,
    selectedControllerId: null,
    loads: [],
    designResult,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

describe('report builders (pure TS)', () => {
  test('buildBom covers PV, inverter, battery, controller, cables and protection', () => {
    const result = sampleResult();
    const bom = buildBom(result);
    expect(bom.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(bom.map((item) => item.category));
    expect(categories.has('PV modules')).toBe(true);
    expect(categories.has('Inverter')).toBe(true);
    expect(categories.has('Battery bank')).toBe(true);
    expect(categories.has('Cables')).toBe(true);
    expect(categories.has('Protection')).toBe(true);
  });

  test('on-grid BOM has no battery/controller categories', () => {
    const input = sampleInput();
    input.systemType = 'on-grid';
    const result = designSystem(input);
    const bom = buildBom(result);
    expect(bom.some((item) => item.category === 'Battery bank')).toBe(false);
    expect(bom.some((item) => item.category === 'Charge controller')).toBe(false);
  });

  test('groupBom preserves category order and aggregates items', () => {
    const result = sampleResult();
    const groups = groupBom(buildBom(result));
    expect(groups.length).toBeGreaterThanOrEqual(5);
    expect(groups[0].category).toBe('PV modules');
    expect(groups[0].items.length).toBeGreaterThan(0);
  });

  test('csvEscape quotes commas and quotes', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape(42)).toBe('42');
  });

  test('bomToCsv produces a header row', () => {
    const result = sampleResult();
    const csv = bomToCsv(buildBom(result));
    expect(csv.startsWith('Category,Part,Specification,Quantity,Unit')).toBe(true);
    expect(csv.split('\r\n').length).toBeGreaterThan(3);
  });

  test('buildCsv escapes newlines', () => {
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });

  test('project export → import round-trips scenarios and loads', () => {
    const result = sampleResult();
    const project: ProjectWithScenarios = {
      id: 'p1',
      name: 'Cabin',
      clientName: 'Jane',
      notes: 'note',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      scenarios: [
        {
          id: 's1',
          projectId: 'p1',
          name: 'Base design',
          isActive: true,
          systemType: 'off-grid',
          systemVoltageV: 48,
          chemistry: 'lifepo4',
          autonomyDays: 2,
          winterPsh: 4,
          summerPsh: 6,
          pshLocation: null,
          inverterEfficiency: null,
          systemLossFactor: null,
          dcVoltageDropPercent: null,
          acVoltageDropPercent: null,
          minTemperatureC: -10,
          tempDeratingFactor: null,
          pvCableLengthM: 8,
          dcCableLengthM: 2,
          acCableLengthM: 10,
          busbarRatingA: null,
          mainBreakerA: null,
          selectedPanelId: null,
          selectedInverterId: null,
          selectedBatteryId: null,
          selectedControllerId: null,
          loads: result.input.loads,
          designResult: result,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    };

    const json = exportProject(project);
    const parsed = parseProjectImport(json);
    expect(parsed.format).toBe('solarcalcpro-project');
    expect(parsed.project.name).toBe('Cabin');
    expect(parsed.project.scenarios).toHaveLength(1);
    expect(parsed.project.scenarios[0].loads).toHaveLength(3);
    expect(parsed.project.scenarios[0].designResult).toBeTruthy();
  });

  test('parseProjectImport rejects non-backup JSON', () => {
    expect(() => parseProjectImport('{"hello": 1}')).toThrow(/not a SlorCalcPro/);
    expect(() => parseProjectImport('not json')).toThrow(/Invalid JSON/);
  });

  test('buildSldDiagram links every edge to existing nodes', () => {
    const result = sampleResult();
    const diagram = buildSldDiagram(result);
    const ids = new Set(diagram.nodes.map((n) => n.id));
    expect(diagram.nodes.length).toBeGreaterThanOrEqual(7);
    for (const edge of diagram.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
    expect(diagram.width).toBeGreaterThan(0);
    expect(diagram.height).toBeGreaterThan(0);
  });

  test('buildSldDiagram includes battery branch for off-grid and grid for on-grid', () => {
    const offGrid = buildSldDiagram(sampleResult());
    expect(offGrid.nodes.some((n) => n.id === 'battery')).toBe(true);
    expect(offGrid.nodes.some((n) => n.id === 'grid')).toBe(false);

    const input = sampleInput();
    input.systemType = 'on-grid';
    const onGrid = buildSldDiagram(designSystem(input));
    expect(onGrid.nodes.some((n) => n.id === 'grid')).toBe(true);
    expect(onGrid.nodes.some((n) => n.id === 'battery')).toBe(false);
  });

  test('buildPdfHtml renders a complete document', () => {
    const result = sampleResult();
    const html = buildPdfHtml({
      projectName: 'Cabin',
      clientName: 'Jane',
      scenario: {
        id: 's1',
        projectId: 'p1',
        name: 'Base design',
        isActive: true,
        systemType: 'off-grid',
        systemVoltageV: 48,
        chemistry: 'lifepo4',
        autonomyDays: 2,
        winterPsh: 4,
        summerPsh: 6,
        pshLocation: null,
        inverterEfficiency: null,
        systemLossFactor: null,
        dcVoltageDropPercent: null,
        acVoltageDropPercent: null,
        minTemperatureC: -10,
        tempDeratingFactor: null,
        pvCableLengthM: 8,
        dcCableLengthM: 2,
        acCableLengthM: 10,
        busbarRatingA: null,
        mainBreakerA: null,
        selectedPanelId: null,
        selectedInverterId: null,
        selectedBatteryId: null,
        selectedControllerId: null,
        loads: result.input.loads,
        designResult: result,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      result,
      bom: buildBom(result),
    });
    expect(html).toContain('SlorCalcPro');
    expect(html).toContain('Single-line diagram');
    expect(html).toContain('Bill of materials');
    expect(html).toContain('Cabin');
  });

  test('compareScenarios returns aligned rows for scenarios with results', () => {
    const base = sampleResult();
    const input = sampleInput();
    input.autonomyDays = 3;
    const bigger = designSystem(input);
    const scenarioA = makeScenario('A', base);
    const scenarioB = makeScenario('B', bigger);

    const { rows, columns } = compareScenarios([scenarioA, scenarioB]);
    expect(columns).toHaveLength(2);
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) expect(row.values).toHaveLength(2);
    const energy = rows.find((r) => r.metric === 'Daily energy');
    expect(energy).toBeTruthy();
    expect(Number(energy!.values[0])).toBeGreaterThan(0);
  });

  test('compareScenarios skips scenarios without a design result', () => {
    const result = sampleResult();
    const withResult = makeScenario('A', result);
    const withoutResult = makeScenario('B', null);
    const { columns } = compareScenarios([withResult, withoutResult]);
    expect(columns).toHaveLength(1);
    const { rows } = compareScenarios([withoutResult, withoutResult]);
    expect(rows).toHaveLength(0);
  });
});
