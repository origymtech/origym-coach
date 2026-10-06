import {
  changeCompanyStatus, companyForHost, companySlugForHost, createCompany,
  listCompanies, makeCompany, validateCompanyInput
} from './company-registry.js';

const COLLECTION = 'origymCoachCompanies';

const clone = company => ({ ...company, branding: { ...company.branding } });

export function createLocalCompanyStore(db) {
  return {
    list: async () => listCompanies(db),
    create: async (input, actorId) => createCompany(db, input, actorId),
    changeStatus: async (id, status) => changeCompanyStatus(db, id, status),
    forHost: async (host, baseDomain) => companyForHost(db, host, baseDomain)
  };
}

/**
 * Firestore storage for production. Document IDs equal brand slugs so the
 * create transaction is the authoritative availability check — two staff
 * members cannot claim the same branded URL concurrently.
 */
export class FirestoreCompanyStore {
  constructor(firestore, collection = COLLECTION) {
    this.companies = firestore.collection(collection);
    this.firestore = firestore;
  }

  async list() {
    const snapshot = await this.companies.orderBy('createdAt').get();
    return snapshot.docs
      .map(doc => doc.data())
      .filter(company => company.status !== 'released')
      .map(clone);
  }

  async create(input, actorId, now = new Date().toISOString()) {
    const valid = validateCompanyInput(input);
    if (!valid.ok) return valid;
    const ref = this.companies.doc(valid.slug);
    return this.firestore.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists && existing.data().status !== 'released') {
        return { ok: false, code: 'taken', message: 'That branded URL is already in use.' };
      }
      const company = makeCompany(valid, actorId, now);
      transaction.set(ref, company);
      return { ok: true, company: clone(company) };
    });
  }

  async changeStatus(id, status, now = new Date().toISOString()) {
    if (!['active', 'suspended'].includes(status)) {
      return { ok: false, code: 'invalid-status', message: 'Company status must be active or suspended.' };
    }
    const snapshot = await this.companies.where('id', '==', id).limit(1).get();
    if (snapshot.empty || snapshot.docs[0].data().status === 'released') {
      return { ok: false, code: 'not-found', message: 'Company not found.' };
    }
    const ref = snapshot.docs[0].ref;
    const company = { ...snapshot.docs[0].data(), status, updatedAt: now };
    await ref.set(company);
    return { ok: true, company: clone(company) };
  }

  async forHost(host, baseDomain) {
    const slug = companySlugForHost(host, baseDomain);
    if (!slug) return null;
    const snapshot = await this.companies.doc(slug).get();
    if (!snapshot.exists) return null;
    const company = snapshot.data();
    return company.status === 'active' ? clone(company) : null;
  }
}

export async function createCompanyStore({ db, mode = 'local', projectId } = {}) {
  if (mode !== 'firestore') return createLocalCompanyStore(db);
  const { Firestore } = await import('@google-cloud/firestore');
  return new FirestoreCompanyStore(new Firestore({ projectId }));
}
