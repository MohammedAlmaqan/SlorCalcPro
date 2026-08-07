import type { BomItem } from './bom';

/** Escape a single CSV cell per RFC 4180. */
export function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize rows to a CSV document. */
export function buildCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

/** BOM → CSV document (BOM header + category rows). */
export function bomToCsv(items: BomItem[]): string {
  const rows: (string | number)[][] = [['Category', 'Part', 'Specification', 'Quantity', 'Unit']];
  for (const item of items) {
    rows.push([item.category, item.part, item.spec, item.qty, item.unit]);
  }
  return buildCsv(rows);
}
