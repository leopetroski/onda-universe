export const DEFAULT_ENGINEERING_STATE = Object.freeze({
  cupDiameter: 75,
  cupHeight: 82,
  shelfWidth: 350,
  shelfDepth: 360,
  gap: 5,
  shelfCount: 3,
  materialThickness: 2,
  materialCostPerKg: 8.4,
});

const finite = (name, value, { min = 0, integer = false } = {}) => {
  if (!Number.isFinite(value) || value <= min || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${name} must be ${integer ? 'a whole number' : 'a number'} greater than ${min}`);
  }
  return value;
};

export function calculateConnectedObjects(input) {
  const cupDiameter = finite('Cup diameter', Number(input.cupDiameter));
  const cupHeight = finite('Cup height', Number(input.cupHeight));
  const shelfWidth = finite('Shelf usable width', Number(input.shelfWidth));
  const shelfDepth = finite('Shelf usable depth', Number(input.shelfDepth));
  const gap = finite('Gap', Number(input.gap), { min: -0.001 });
  const shelfCount = finite('Shelf count', Number(input.shelfCount), { integer: true });
  const materialThickness = finite('Material thickness', Number(input.materialThickness));
  const materialCostPerKg = finite('Material cost', Number(input.materialCostPerKg), { min: -0.001 });

  const columns = Math.floor((shelfWidth + gap) / (cupDiameter + gap));
  const rows = Math.floor((shelfDepth + gap) / (cupDiameter + gap));
  const cupsPerShelf = Math.max(0, columns * rows);
  const totalCapacity = cupsPerShelf * shelfCount;
  const trayWidth = columns ? columns * cupDiameter + Math.max(0, columns - 1) * gap : 0;
  const trayDepth = rows ? rows * cupDiameter + Math.max(0, rows - 1) * gap : 0;
  const edgeClearanceX = (shelfWidth - trayWidth) / 2;
  const edgeClearanceZ = (shelfDepth - trayDepth) / 2;
  const trayVolumeMm3 = trayWidth * trayDepth * materialThickness;
  const estimatedMassKg = trayVolumeMm3 * 1.24e-6;
  const estimatedMaterialCost = estimatedMassKg * materialCostPerKg;

  return {
    columns, rows, cupsPerShelf, totalCapacity,
    trayWidth, trayDepth, edgeClearanceX, edgeClearanceZ,
    estimatedMassKg, estimatedMaterialCost,
    constraints: {
      packing: columns > 0 && rows > 0 ? 'pass' : 'fail',
      height: 'unverified', airflow: 'unverified', tolerance: 'unverified', physicalValidation: 'required',
    },
    provenance: {
      shelfDimensions: 'illustrative-demo',
      cupDimensions: 'illustrative-demo',
      fridgeExterior: 'verified-reference',
      calculation: 'deterministic-rectangular-packing',
    },
    formula: 'floor((width + gap) / (diameter + gap)) × floor((depth + gap) / (diameter + gap))',
    fridgeExteriorMm: [435, 475, 500],
    cupHeight,
  };
}

export function dependencyImpact(previous, next) {
  const changed = Object.keys(next).filter(key => Number(previous[key]) !== Number(next[key]));
  const affected = new Set();
  const graph = {
    cupDiameter: ['packing', 'trayGeometry', 'capacity', 'materialEstimate'],
    cupHeight: ['heightConstraint'],
    shelfWidth: ['packing', 'trayGeometry', 'capacity', 'materialEstimate'],
    shelfDepth: ['packing', 'trayGeometry', 'capacity', 'materialEstimate'],
    gap: ['packing', 'trayGeometry', 'capacity', 'materialEstimate'],
    shelfCount: ['capacity'],
    materialThickness: ['materialEstimate'],
    materialCostPerKg: ['materialEstimate'],
  };
  changed.forEach(key => (graph[key] || []).forEach(item => affected.add(item)));
  return { changed, affected: [...affected] };
}

export function createRevision(state, result, previous, source = 'user-entered-demo') {
  return {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    source,
    state: { ...state },
    result: { totalCapacity: result.totalCapacity, trayWidth: result.trayWidth, trayDepth: result.trayDepth },
    impact: dependencyImpact(previous || state, state),
    approval: 'draft-not-approved',
  };
}
