import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ENGINEERING_STATE } from './universe-core.mjs';
import { SCHEMA_VERSION, appendRevision, createEmptyStore, loadStore, migrateStore, rollbackRevision, saveStore } from './persistence.mjs';

const memoryStorage = initial => { let value = initial; return { getItem: () => value, setItem: (_key, next) => { value = next; }, value: () => value }; };

test('legacy state migrates without silently discarding valid values', () => {
  const store = migrateStore({ state: { ...DEFAULT_ENGINEERING_STATE, cupDiameter: 90 }, revisions: [] });
  assert.equal(store.schemaVersion, SCHEMA_VERSION); assert.equal(store.validatedState.cupDiameter, 90);
});
test('malformed and invalid stored records recover to safe defaults with an error', () => {
  assert.match(loadStore(memoryStorage('{bad')).error, /could not be loaded/);
  const invalid = JSON.stringify({ schemaVersion: 2, validatedState: { ...DEFAULT_ENGINEERING_STATE, gap: -2 }, revisions: [] });
  assert.match(loadStore(memoryStorage(invalid)).error, /schema validation/);
});
test('invalid drafts cannot overwrite validated state or create revisions', () => {
  const store = createEmptyStore(); assert.throws(() => appendRevision(store, { ...DEFAULT_ENGINEERING_STATE, cupDiameter: '' }, store.validatedState), /Invalid drafts/); assert.equal(store.revisions.length, 0);
});
test('save failures are recoverable and reported', () => {
  const storage = { setItem: () => { throw new Error('quota exceeded'); } }; const outcome = saveStore(createEmptyStore(), storage); assert.equal(outcome.ok, false); assert.match(outcome.error, /memory/);
});
test('rollback creates a child revision instead of mutating history', () => {
  let store = createEmptyStore(); store = appendRevision(store, DEFAULT_ENGINEERING_STATE, DEFAULT_ENGINEERING_STATE); store = appendRevision(store, { ...DEFAULT_ENGINEERING_STATE, cupDiameter: 90 }, DEFAULT_ENGINEERING_STATE);
  const original = store.revisions[0], rolled = rollbackRevision(store, original.id); assert.equal(rolled.revisions.length, 3); assert.equal(rolled.validatedState.cupDiameter, 75); assert.match(rolled.revisions[2].operation, /^rollback:/);
});
