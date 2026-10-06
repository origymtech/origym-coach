import test from 'node:test';
import assert from 'node:assert/strict';
import { FirestoreCompanyStore } from '../company-store.js';

function fakeFirestore() {
  const docs = new Map();
  const ref = id => ({
    id,
    get: async () => snapshot(id),
    set: async value => docs.set(id, structuredClone(value))
  });
  const snapshot = id => {
    const value = docs.get(id);
    return { exists: value !== undefined, data: () => structuredClone(value), ref: ref(id) };
  };
  const collection = {
    doc: ref,
    orderBy: () => ({ get: async () => ({ docs: [...docs.keys()].sort().map(snapshot) }) }),
    where: (_field, _operator, value) => ({
      limit: () => ({ get: async () => {
        const found = [...docs.entries()].find(([, company]) => company.id === value);
        return found ? { empty: false, docs: [snapshot(found[0])] } : { empty: true, docs: [] };
      } })
    })
  };
  return {
    collection: () => collection,
    runTransaction: fn => fn({
      get: async target => target.get(),
      set: (target, value) => docs.set(target.id, structuredClone(value))
    })
  };
}

test('Firestore company creation reserves the slug in a transaction', async () => {
  const store = new FirestoreCompanyStore(fakeFirestore());
  const first = await store.create({ name: 'Sam Fitness', slug: 'samfit' }, 'admin', '2026-10-06T09:00:00.000Z');
  assert.equal(first.ok, true);
  const duplicate = await store.create({ name: 'Another Sam', slug: 'SAMFIT' }, 'admin', '2026-10-06T09:01:00.000Z');
  assert.equal(duplicate.code, 'taken');
});

test('Firestore host resolution only returns an active company', async () => {
  const store = new FirestoreCompanyStore(fakeFirestore());
  const created = await store.create({ name: 'Sam Fitness', slug: 'samfit' }, 'admin');
  assert.equal((await store.forHost('samfit.coach.origym.co.uk', 'coach.origym.co.uk')).id, created.company.id);
  await store.changeStatus(created.company.id, 'suspended');
  assert.equal(await store.forHost('samfit.coach.origym.co.uk', 'coach.origym.co.uk'), null);
});
