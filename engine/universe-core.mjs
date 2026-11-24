export const FORMULA_VERSION = 'connected-core/2.0.0';
export const VALIDATION_STATES = Object.freeze(['pass', 'fail', 'unverified', 'not-applicable']);

export const PARAMETER_DEFINITIONS = Object.freeze({
  cupDiameter: { id: 'cup.diameter', label: 'Cup diameter', unit: 'mm', type: 'number', min: 1, max: 500, tolerance: null, provenance: 'illustrative-demo' },
  cupHeight: { id: 'cup.height', label: 'Cup height', unit: 'mm', type: 'number', min: 1, max: 1000, tolerance: null, provenance: 'illustrative-demo' },
  shelfWidth: { id: 'fridge.shelf.usableWidth', label: 'Shelf usable width', unit: 'mm', type: 'number', min: 1, max: 2000, tolerance: null, provenance: 'illustrative-demo' },
  shelfDepth: { id: 'fridge.shelf.usableDepth', label: 'Shelf usable depth', unit: 'mm', type: 'number', min: 1, max: 2000, tolerance: null, provenance: 'illustrative-demo' },
  gap: { id: 'tray.cupGap', label: 'Gap', unit: 'mm', type: 'number', min: 0, max: 100, tolerance: null, provenance: 'user-entered-demo' },
  shelfCount: { id: 'fridge.shelf.count', label: 'Shelf count', unit: 'count', type: 'integer', min: 1, max: 100, tolerance: null, provenance: 'illustrative-demo' },
  materialThickness: { id: 'tray.material.thickness', label: 'Solid plate thickness', unit: 'mm', type: 'number', min: 0.1, max: 50, tolerance: null, provenance: 'user-entered-demo' },
  materialDensity: { id: 'tray.material.density', label: 'Illustrative density', unit: 'g/cm³', type: 'number', min: 0.01, max: 30, tolerance: null, provenance: 'illustrative-demo' },
  materialCostPerKg: { id: 'tray.material.cost', label: 'Material cost', unit: 'AUD/kg', type: 'number', min: 0, max: 100000, tolerance: null, provenance: 'user-entered-demo' },
});

export const DEFAULT_ENGINEERING_STATE = Object.freeze({ cupDiameter: 75, cupHeight: 82, shelfWidth: 350, shelfDepth: 360, gap: 5, shelfCount: 3, materialThickness: 2, materialDensity: 1.24, materialCostPerKg: 8.4 });

export const OBJECT_REGISTRY = Object.freeze([
  { id: 'product.banoffee.blueprint', kind: 'blueprint', type: 'product', name: 'Banoffee Product Blueprint', relationships: [{ type: 'uses', target: 'container.cup.blueprint' }] },
  { id: 'container.cup.blueprint', kind: 'blueprint', type: 'container', name: 'Cup Blueprint', relationships: [{ type: 'drives', target: 'support.tray.blueprint' }] },
  { id: 'support.tray.blueprint', kind: 'blueprint', type: 'engineering-geometry', name: 'Tray Blueprint', relationships: [{ type: 'fits', target: 'appliance.fridge.blueprint' }] },
  { id: 'appliance.fridge.blueprint', kind: 'blueprint', type: 'appliance', name: 'Fridge Blueprint', relationships: [] },
  { id: 'appliance.fridge.demo-001', kind: 'instance', type: 'appliance', name: 'Fridge Demo Instance', blueprintId: 'appliance.fridge.blueprint', relationships: [{ type: 'contains', target: 'support.tray.blueprint' }] },
]);

export function validateDraft(input) {
  const value = {}, errors = [];
  for (const [key, definition] of Object.entries(PARAMETER_DEFINITIONS)) {
    const raw = input?.[key];
    if (raw === '' || raw === null || raw === undefined) { errors.push({ key, code: 'required', message: `${definition.label} is required` }); continue; }
    const number = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(number) || !Number.isSafeInteger(number) && definition.type === 'integer') errors.push({ key, code: 'type', message: `${definition.label} must be a finite ${definition.type}` });
    else if (number < definition.min || number > definition.max) errors.push({ key, code: 'range', message: `${definition.label} must be between ${definition.min} and ${definition.max} ${definition.unit}` });
    else value[key] = number;
  }
  return { valid: errors.length === 0, value, errors, status: errors.length ? 'fail' : 'pass' };
}

export class DependencyGraph {
  constructor(nodes, formulas) { this.nodes = [...nodes]; this.formulas = { ...formulas }; this.edges = []; }
  connect(from, to) { if (!this.nodes.includes(from) || !this.nodes.includes(to)) throw new Error(`Unknown dependency node: ${from} → ${to}`); this.edges.push({ from, to }); return this; }
  order() {
    const incoming = new Map(this.nodes.map(node => [node, 0]));
    this.edges.forEach(({ to }) => incoming.set(to, incoming.get(to) + 1));
    const queue = this.nodes.filter(node => incoming.get(node) === 0), result = [];
    while (queue.length) { const node = queue.shift(); result.push(node); this.edges.filter(edge => edge.from === node).forEach(({ to }) => { incoming.set(to, incoming.get(to) - 1); if (incoming.get(to) === 0) queue.push(to); }); }
    if (result.length !== this.nodes.length) throw new Error('Circular dependency detected');
    return result;
  }
  affected(changed) { const found = new Set(), queue = [...changed]; while (queue.length) { const node = queue.shift(); this.edges.filter(edge => edge.from === node).forEach(({ to }) => { if (!found.has(to)) { found.add(to); queue.push(to); } }); } return this.order().filter(node => found.has(node)); }
  evaluate(seed) { const values = { ...seed }; for (const node of this.order()) if (this.formulas[node]) values[node] = this.formulas[node](values); return values; }
}

const packingFormula = values => {
  const columns = Math.floor((values.shelfWidth + values.gap) / (values.cupDiameter + values.gap));
  const rows = Math.floor((values.shelfDepth + values.gap) / (values.cupDiameter + values.gap));
  return columns > 0 && rows > 0 ? { columns, rows, cupsPerShelf: columns * rows } : { columns: 0, rows: 0, cupsPerShelf: 0 };
};
const trayFormula = values => ({ width: values.packing.columns ? values.packing.columns * values.cupDiameter + (values.packing.columns - 1) * values.gap : 0, depth: values.packing.rows ? values.packing.rows * values.cupDiameter + (values.packing.rows - 1) * values.gap : 0 });

export function createEngineeringGraph() {
  const inputs = Object.keys(PARAMETER_DEFINITIONS), derived = ['packing', 'trayGeometry', 'capacity', 'materialEstimate', 'heightConstraint'];
  const graph = new DependencyGraph([...inputs, ...derived], {
    packing: packingFormula,
    trayGeometry: trayFormula,
    capacity: values => values.packing.cupsPerShelf * values.shelfCount,
    materialEstimate: values => { const volumeMm3 = values.trayGeometry.width * values.trayGeometry.depth * values.materialThickness; const solidPlateMassKg = volumeMm3 * values.materialDensity * 1e-6; return { volumeMm3, solidPlateMassKg, estimatedCost: solidPlateMassKg * values.materialCostPerKg }; },
    heightConstraint: () => ({ status: 'unverified', reason: 'Usable internal height has not been measured' }),
  });
  ['cupDiameter', 'shelfWidth', 'shelfDepth', 'gap'].forEach(node => graph.connect(node, 'packing'));
  ['packing', 'cupDiameter', 'gap'].forEach(node => graph.connect(node, 'trayGeometry'));
  ['packing', 'shelfCount'].forEach(node => graph.connect(node, 'capacity'));
  ['trayGeometry', 'materialThickness', 'materialDensity', 'materialCostPerKg'].forEach(node => graph.connect(node, 'materialEstimate'));
  graph.connect('cupHeight', 'heightConstraint'); return graph;
}

export function calculateConnectedObjects(input) {
  const draft = validateDraft(input); if (!draft.valid) throw new RangeError(draft.errors.map(error => error.message).join('; '));
  const values = createEngineeringGraph().evaluate(draft.value), { packing, trayGeometry, materialEstimate } = values;
  const fit = packing.cupsPerShelf > 0;
  return {
    columns: packing.columns, rows: packing.rows, cupsPerShelf: packing.cupsPerShelf, totalCapacity: values.capacity,
    trayWidth: trayGeometry.width, trayDepth: trayGeometry.depth,
    edgeClearanceX: fit ? (values.shelfWidth - trayGeometry.width) / 2 : values.shelfWidth / 2,
    edgeClearanceZ: fit ? (values.shelfDepth - trayGeometry.depth) / 2 : values.shelfDepth / 2,
    solidPlateVolumeMm3: materialEstimate.volumeMm3,
    estimatedMassKg: materialEstimate.solidPlateMassKg,
    estimatedMaterialCost: materialEstimate.estimatedCost,
    constraints: { packing: fit ? 'pass' : 'fail', height: 'unverified', airflow: 'unverified', tolerance: 'unverified', physicalValidation: 'unverified' },
    provenance: { shelfDimensions: 'illustrative-demo', cupDimensions: 'illustrative-demo', fridgeExterior: 'verified-reference', calculation: 'derived' },
    formula: 'floor((width + gap) / (diameter + gap)) × floor((depth + gap) / (diameter + gap))',
    formulaVersion: FORMULA_VERSION, fridgeExteriorMm: [435, 475, 500], cupHeight: values.cupHeight,
  };
}

export function dependencyImpact(previous, next) {
  const changed = Object.keys(PARAMETER_DEFINITIONS).filter(key => previous?.[key] !== next?.[key]);
  return { changed, affected: createEngineeringGraph().affected(changed) };
}

const hash = value => { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0).toString(36); };
export function createRevision(state, result, previous, parentId = null, operation = 'save') {
  const snapshot = JSON.parse(JSON.stringify({ parameters: state, derived: { totalCapacity: result.totalCapacity, trayWidth: result.trayWidth, trayDepth: result.trayDepth, solidPlateMassKg: result.estimatedMassKg }, constraints: result.constraints }));
  const createdAt = new Date().toISOString();
  return Object.freeze({ id: `rev-${Date.now().toString(36)}-${hash(JSON.stringify(snapshot))}`, parentId, createdAt, operation, formulaVersion: FORMULA_VERSION, source: 'user-entered-demo', snapshot, impact: dependencyImpact(previous || state, state), validation: 'pass', approval: 'draft-not-approved' });
}

export function compareRevisions(left, right) {
  const keys = Object.keys(PARAMETER_DEFINITIONS); return keys.filter(key => left.snapshot.parameters[key] !== right.snapshot.parameters[key]).map(key => ({ key, from: left.snapshot.parameters[key], to: right.snapshot.parameters[key] }));
}
