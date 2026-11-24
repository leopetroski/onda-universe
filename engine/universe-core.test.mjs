import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ENGINEERING_STATE, FORMULA_VERSION, OBJECT_REGISTRY, DependencyGraph, calculateConnectedObjects, compareRevisions, createEngineeringGraph, createRevision, dependencyImpact, validateDraft } from './universe-core.mjs';

test('default demo produces 4 × 4 packing, 48 capacity and physically consistent solid-plate mass', () => {
  const result = calculateConnectedObjects(DEFAULT_ENGINEERING_STATE);
  assert.deepEqual([result.columns, result.rows, result.cupsPerShelf, result.totalCapacity], [4, 4, 16, 48]);
  assert.deepEqual([result.trayWidth, result.trayDepth], [315, 315]);
  assert.equal(result.solidPlateVolumeMm3, 198450);
  assert.equal(result.estimatedMassKg, 0.246078);
  assert.equal(result.formulaVersion, FORMULA_VERSION);
});

test('validation rejects blank, NaN, infinity, negative, unsafe and unreasonable values', () => {
  for (const patch of [{ cupDiameter: '' }, { gap: -1 }, { shelfWidth: Infinity }, { shelfCount: Number.MAX_SAFE_INTEGER + 1 }, { shelfDepth: 2001 }, { materialCostPerKg: -1 }]) {
    const draft = validateDraft({ ...DEFAULT_ENGINEERING_STATE, ...patch });
    assert.equal(draft.valid, false, JSON.stringify(patch));
    assert.throws(() => calculateConnectedObjects({ ...DEFAULT_ENGINEERING_STATE, ...patch }), RangeError);
  }
});

test('no-fit on either axis returns a bounded consistent empty geometry', () => {
  const widthFailure = calculateConnectedObjects({ ...DEFAULT_ENGINEERING_STATE, shelfWidth: 50 });
  const depthFailure = calculateConnectedObjects({ ...DEFAULT_ENGINEERING_STATE, shelfDepth: 50 });
  for (const result of [widthFailure, depthFailure]) {
    assert.deepEqual([result.columns, result.rows, result.cupsPerShelf, result.totalCapacity, result.trayWidth, result.trayDepth], [0, 0, 0, 0, 0, 0]);
    assert.equal(result.constraints.packing, 'fail');
  }
});

test('executable graph evaluates in deterministic order and propagates transitively', () => {
  const graph = createEngineeringGraph();
  assert.deepEqual(graph.affected(['cupDiameter']), ['packing', 'trayGeometry', 'capacity', 'materialEstimate']);
  assert.deepEqual(dependencyImpact(DEFAULT_ENGINEERING_STATE, { ...DEFAULT_ENGINEERING_STATE, cupDiameter: 80 }).affected, ['packing', 'trayGeometry', 'capacity', 'materialEstimate']);
});

test('dependency graph detects cycles and unknown nodes', () => {
  const graph = new DependencyGraph(['a', 'b'], {}); graph.connect('a', 'b').connect('b', 'a');
  assert.throws(() => graph.order(), /Circular/);
  assert.throws(() => graph.connect('missing', 'a'), /Unknown/);
});

test('registry separates reusable blueprints from fridge instance', () => {
  assert.equal(OBJECT_REGISTRY.filter(object => object.kind === 'blueprint').length, 4);
  const instance = OBJECT_REGISTRY.find(object => object.kind === 'instance');
  assert.equal(instance.blueprintId, 'appliance.fridge.blueprint');
});

test('revisions have parents, immutable snapshots and comparable parameters', () => {
  const firstResult = calculateConnectedObjects(DEFAULT_ENGINEERING_STATE);
  const first = createRevision(DEFAULT_ENGINEERING_STATE, firstResult, DEFAULT_ENGINEERING_STATE);
  const nextState = { ...DEFAULT_ENGINEERING_STATE, cupDiameter: 90 };
  const second = createRevision(nextState, calculateConnectedObjects(nextState), DEFAULT_ENGINEERING_STATE, first.id);
  assert.equal(second.parentId, first.id);
  assert.equal(Object.isFrozen(second), true);
  assert.deepEqual(compareRevisions(first, second), [{ key: 'cupDiameter', from: 75, to: 90 }]);
});
