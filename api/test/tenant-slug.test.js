import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TENANT_SLUG_LENGTH,
  checkTenantSlugAvailability,
  validateTenantSlug
} from '../tenant-slug.js';

test('accepts a short lowercase hostname label', () => {
  assert.deepEqual(validateTenantSlug('fitwithsam'), { ok: true, slug: 'fitwithsam' });
  assert.equal(MAX_TENANT_SLUG_LENGTH, 10);
});

test('normalises case but never converts spaces or punctuation', () => {
  assert.deepEqual(validateTenantSlug('FitWithSam'), { ok: true, slug: 'fitwithsam' });
  assert.equal(validateTenantSlug('fit sam').code, 'invalid-format');
  assert.equal(validateTenantSlug('fit.sam').code, 'invalid-format');
  assert.equal(validateTenantSlug('-sam').code, 'invalid-format');
  assert.equal(validateTenantSlug('sam-').code, 'invalid-format');
});

test('rejects names longer than ten characters', () => {
  assert.equal(validateTenantSlug('elevenchars').code, 'too-long');
});

test('rejects platform-reserved names', () => {
  assert.equal(validateTenantSlug('coach').code, 'reserved');
  assert.equal(validateTenantSlug('ADMIN').code, 'reserved');
});

test('checks against active and suspended company versions before claim', () => {
  const companies = [
    { slug: 'FitWithSam', status: 'active' },
    { slug: 'trainjamie', status: 'suspended' },
    { slug: 'oldbrand', status: 'released' }
  ];
  assert.equal(checkTenantSlugAvailability('fitwithsam', companies).code, 'taken');
  assert.equal(checkTenantSlugAvailability('TRAINJAMIE', companies).code, 'taken');
  assert.deepEqual(checkTenantSlugAvailability('oldbrand', companies), { ok: true, slug: 'oldbrand' });
});
