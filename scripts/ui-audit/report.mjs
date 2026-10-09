const MAX_CELL = 78;
const COLUMNS = ['kind', 'route', 'where', 'selector', 'measured'];

function variantLabel({ viewport, theme, language }) {
  return `${viewport} ${theme} ${language}`;
}

function shortRoute(route) {
  return route.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id');
}

function groupKey(finding) {
  return [finding.kind, shortRoute(finding.route), finding.selector, finding.text].join('|');
}

export function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const key = groupKey(finding);
    const group = groups.get(key) ?? { ...finding, route: shortRoute(finding.route), variants: [] };
    group.variants.push({ label: variantLabel(finding), detail: finding.detail });
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.route.localeCompare(b.route));
}

function distinct(variants, index) {
  return [...new Set(variants.map((variant) => variant.label.split(' ')[index]))];
}

function summarizeVariants(variants) {
  const widths = distinct(variants, 0).map((viewport) => viewport.split('x')[0]);
  const where = `${widths.join('/')} ${distinct(variants, 1).join('/')} ${distinct(variants, 2).join('/')}`;
  return { where, measured: variants[0].detail };
}

export function toRows(groups) {
  return groups.map((group) => {
    const { where, measured } = summarizeVariants(group.variants);
    const target = group.text ? `${group.text} | ${group.selector}` : group.selector;
    return [group.kind, group.route, where, target, measured];
  });
}

function pad(text, width) {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function clip(text) {
  return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 1)}~` : text;
}

export function formatTable(allRows, maxRows = 80) {
  if (allRows.length === 0) return 'No findings.';
  const rows = allRows.slice(0, maxRows).map((row) => row.map(clip));
  const all = [COLUMNS, ...rows];
  const widths = COLUMNS.map((_, index) => Math.max(...all.map((row) => row[index].length)));
  const line = (row) => row.map((cell, index) => pad(cell, widths[index])).join('  ');
  return [line(COLUMNS), ...rows.map(line)].join('\n');
}

export function countByKind(findings) {
  const counts = {};
  for (const finding of findings) counts[finding.kind] = (counts[finding.kind] ?? 0) + 1;
  return counts;
}
