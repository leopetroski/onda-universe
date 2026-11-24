import { DEFAULT_ENGINEERING_STATE, FORMULA_VERSION, PARAMETER_DEFINITIONS, calculateConnectedObjects, createRevision, validateDraft } from './universe-core.mjs';

export const STORAGE_KEY = 'onda-universe-engine-alpha';
export const SCHEMA_VERSION = 2;

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validRevision = revision => isRecord(revision) && typeof revision.id === 'string' && revision.id.length <= 128 && typeof revision.createdAt === 'string' && isRecord(revision.snapshot) && validateDraft(revision.snapshot.parameters).valid;

export function createEmptyStore() { return { schemaVersion: SCHEMA_VERSION, validatedState: { ...DEFAULT_ENGINEERING_STATE }, revisions: [], lastError: null }; }

export function migrateStore(value) {
  if (!isRecord(value)) return createEmptyStore();
  if (value.schemaVersion === SCHEMA_VERSION) {
    const draft = validateDraft(value.validatedState);
    if (!draft.valid) throw new Error('Stored validated state failed schema validation');
    const revisions = Array.isArray(value.revisions) ? value.revisions.filter(validRevision).slice(-100) : [];
    return { schemaVersion: SCHEMA_VERSION, validatedState: draft.value, revisions, lastError: typeof value.lastError === 'string' ? value.lastError : null };
  }
  const legacyDraft = validateDraft({ ...DEFAULT_ENGINEERING_STATE, ...(isRecord(value.state) ? value.state : {}) });
  if (!legacyDraft.valid) throw new Error('Legacy state contains invalid engineering parameters');
  const migrated = createEmptyStore(); migrated.validatedState = legacyDraft.value;
  if (Array.isArray(value.revisions)) {
    let parentId = null;
    for (const old of value.revisions.slice(-100)) {
      const oldState = isRecord(old?.state) ? { ...DEFAULT_ENGINEERING_STATE, ...old.state } : legacyDraft.value;
      const check = validateDraft(oldState); if (!check.valid) continue;
      const revision = createRevision(check.value, calculateConnectedObjects(check.value), check.value, parentId, 'legacy-migration');
      migrated.revisions.push(revision); parentId = revision.id;
    }
  }
  return migrated;
}

export function loadStore(storage = globalThis.localStorage) {
  if (!storage) return { store: createEmptyStore(), error: 'Local storage is unavailable' };
  try {
    const raw = storage.getItem(STORAGE_KEY); if (raw === null) return { store: createEmptyStore(), error: null };
    return { store: migrateStore(JSON.parse(raw)), error: null };
  } catch (error) { return { store: createEmptyStore(), error: `Stored data could not be loaded: ${error.message}` }; }
}

export function saveStore(store, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, error: 'Local storage is unavailable' };
  try {
    const checked = migrateStore(store); storage.setItem(STORAGE_KEY, JSON.stringify(checked)); return { ok: true, error: null };
  } catch (error) { return { ok: false, error: `Changes remain in memory: ${error.message}` }; }
}

export function appendRevision(store, parameters, previous, operation = 'save') {
  const draft = validateDraft(parameters); if (!draft.valid) throw new RangeError('Invalid drafts cannot create revisions');
  const parentId = store.revisions.at(-1)?.id || null;
  const revision = createRevision(draft.value, calculateConnectedObjects(draft.value), previous, parentId, operation);
  return { ...store, validatedState: { ...draft.value }, revisions: [...store.revisions, revision].slice(-100), lastError: null };
}

export function rollbackRevision(store, revisionId) {
  const target = store.revisions.find(revision => revision.id === revisionId); if (!target) throw new Error('Revision not found');
  return appendRevision(store, target.snapshot.parameters, store.validatedState, `rollback:${revisionId}`);
}
