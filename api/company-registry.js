import crypto from 'node:crypto';
import { checkTenantSlugAvailability, validateTenantSlug } from './tenant-slug.js';

const ACTIVE_STATUSES = new Set(['active', 'suspended']);
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function companiesOf(db) {
  if (!Array.isArray(db.companies)) db.companies = [];
  return db.companies;
}

export function listCompanies(db) {
  return companiesOf(db)
    .filter(company => company.status !== 'released')
    .map(company => ({ ...company, branding: { ...company.branding } }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function validateCompanyInput(input) {
  const name = text(input?.name, 80);
  if (name.length < 2) return { ok: false, code: 'invalid-name', message: 'Company name must be at least 2 characters.' };

  const slug = validateTenantSlug(input?.slug);
  if (!slug.ok) return slug;

  const primaryColour = text(input?.primaryColour || '#EB7C16', 7);
  if (!HEX_COLOUR.test(primaryColour)) {
    return { ok: false, code: 'invalid-colour', message: 'Primary colour must be a six-digit hex colour.' };
  }
  return { ok: true, name, slug: slug.slug, primaryColour: primaryColour.toUpperCase() };
}

export function makeCompany(validated, actorId, now = new Date().toISOString()) {
  return {
    id: `company_${crypto.randomUUID()}`,
    slug: validated.slug,
    name: validated.name,
    status: 'active',
    branding: { primaryColour: validated.primaryColour, logoUrl: null },
    createdAt: now,
    createdBy: actorId,
    updatedAt: now
  };
}

/**
 * The local bootstrap implementation. Its input/output boundary deliberately
 * mirrors the Firestore repository we will use before production; only this
 * storage layer should change during that migration.
 */
export function createCompany(db, input, actorId, now = new Date().toISOString()) {
  const valid = validateCompanyInput(input);
  if (!valid.ok) return valid;
  const availability = checkTenantSlugAvailability(valid.slug, companiesOf(db));
  if (!availability.ok) return availability;
  const company = makeCompany({ ...valid, slug: availability.slug }, actorId, now);
  companiesOf(db).push(company);
  return { ok: true, company: { ...company, branding: { ...company.branding } } };
}

export function changeCompanyStatus(db, companyId, status, now = new Date().toISOString()) {
  if (!ACTIVE_STATUSES.has(status)) return { ok: false, code: 'invalid-status', message: 'Company status must be active or suspended.' };
  const company = companiesOf(db).find(item => item.id === companyId && item.status !== 'released');
  if (!company) return { ok: false, code: 'not-found', message: 'Company not found.' };
  company.status = status;
  company.updatedAt = now;
  return { ok: true, company: { ...company, branding: { ...company.branding } } };
}

export function companyForHost(db, host, baseDomain = 'coach.origym.co.uk') {
  const slug = companySlugForHost(host, baseDomain);
  if (!slug) return null;
  return companiesOf(db).find(company => company.slug === slug && company.status === 'active') || null;
}

export function companySlugForHost(host, baseDomain = 'coach.origym.co.uk') {
  const hostname = String(host || '').toLowerCase().split(':')[0];
  const suffix = '.' + baseDomain.toLowerCase();
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  if (!slug || slug.includes('.')) return null;
  return slug;
}
