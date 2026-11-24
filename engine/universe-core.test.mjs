import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateConnectedObjects, dependencyImpact, DEFAULT_ENGINEERING_STATE } from './universe-core.mjs';

test('illustrative reference produces deterministic 4 x 4 packing across 3 shelves', () => {
  const result = calculateConnectedObjects(DEFAULT_ENGINEERING_STATE);
  assert.equal(result.columns, 4);
  assert.equal(result.rows, 4);
  assert.equal(result.cupsPerShelf, 16);
  assert.equal(result.totalCapacity, 48);
  assert.equal(result.trayWidth, 315);
  assert.equal(result.trayDepth, 315);
});

test('cup diameter propagates to geometry, packing, capacity and material estimate', () => {
  const next = { ...DEFAULT_ENGINEERING_STATE, cupDiameter: 80 };
  assert.deepEqual(dependencyImpact(DEFAULT_ENGINEERING_STATE, next), {
    changed: ['cupDiameter'],
    affected: ['packing', 'trayGeometry', 'capacity', 'materialEstimate'],
  });
  assert.equal(calculateConnectedObjects(next).totalCapacity, 48);
});

test('invalid engineering parameters are rejected', () => {
  assert.throws(() => calculateConnectedObjects({ ...DEFAULT_ENGINEERING_STATE, shelfCount: 2.5 }), /whole number/);
  assert.throws(() => calculateConnectedObjects({ ...DEFAULT_ENGINEERING_STATE, cupDiameter: 0 }), /greater than/);
});
