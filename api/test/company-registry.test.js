import test from 'node:test';
import assert from 'node:assert/strict';
import { changeCompanyStatus, companyForHost, createCompany, listCompanies } from '../company-registry.js';

const now = '2026-10-06T09:00:00.000Z';
const create = (db, input = {}) => createCompany(db, {
  name: 'Sam Fitness', slug: 'samfit', primaryColour: '#e6413d', ...input
}, 'origym-admin', now);

test('creates a company version with a unique public slug', () => {
  const db = {};
  const result = create(db);
  assert.equal(result.ok, true);
  assert.equal(result.company.slug, 'samfit');
  assert.equal(result.company.status, 'active');
  assert.equal(result.company.branding.primaryColour, '#E6413D');
  assert.equal(listCompanies(db).length, 1);
});

test('refuses a second company that claims the same branded address', () => {
  const db = {};
  assert.equal(create(db).ok, true);
  assert.equal(create(db, { name: 'Sam Fitness Two', slug: 'SAMFIT' }).code, 'taken');
});

test('does not release a deleted label until an authorised retention process marks it released', () => {
  const db = { companies: [{ id: 'company_1', name: 'Old Brand', slug: 'oldbrand', status: 'deleted', branding: {}, createdAt: now }] };
  assert.equal(create(db, { name: 'New Brand', slug: 'oldbrand' }).code, 'taken');
  db.companies[0].status = 'released';
  assert.equal(create(db, { name: 'New Brand', slug: 'oldbrand' }).ok, true);
});

test('only active companies resolve from branded trainer hostnames', () => {
  const db = {};
  const { company } = create(db);
  assert.equal(companyForHost(db, 'samfit.coach.origym.co.uk')?.id, company.id);
  assert.equal(companyForHost(db, 'admin.coach.origym.co.uk'), null);
  assert.equal(companyForHost(db, 'samfit.coach.origym.co.uk.evil.test'), null);
  assert.equal(changeCompanyStatus(db, company.id, 'suspended').ok, true);
  assert.equal(companyForHost(db, 'samfit.coach.origym.co.uk'), null);
});
