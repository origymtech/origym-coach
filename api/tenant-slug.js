/**
 * The hostname label a trainer claims at <slug>.coach.origym.co.uk.
 *
 * A slug is a permanent public identifier, not display copy. Keep it short,
 * predictable and separate from the company name so branding can change
 * without breaking client links.
 */
export const MAX_TENANT_SLUG_LENGTH = 10;

// Platform routes and names that must never be claimed by a trainer.
export const RESERVED_TENANT_SLUGS = new Set([
  'admin', 'api', 'app', 'assets', 'coach', 'help', 'legal', 'origym',
  'privacy', 'status', 'support', 'terms', 'www'
]);

export function normaliseTenantSlug(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Validates a trainer's requested branded URL label. This deliberately does
 * not convert spaces or punctuation into hyphens: the claimed value needs to
 * be explicit, and the business requirement is no spaces.
 */
export function validateTenantSlug(value) {
  const slug = normaliseTenantSlug(value);
  if (!slug) return { ok: false, code: 'required', message: 'Choose a branded URL.' };
  if (slug.length > MAX_TENANT_SLUG_LENGTH) {
    return { ok: false, code: 'too-long', message: `Use ${MAX_TENANT_SLUG_LENGTH} characters or fewer.` };
  }
  if (!/^[a-z0-9-]+$/.test(slug) || slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, code: 'invalid-format', message: 'Use lowercase letters, numbers and internal hyphens only; spaces are not allowed.' };
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    return { ok: false, code: 'reserved', message: 'That branded URL is reserved.' };
  }
  return { ok: true, slug };
}

/**
 * Checks a requested label against the company registry. Call this from the
 * database transaction that creates a company: a browser-only check is not a
 * safe availability check when two people submit the same name together.
 */
export function checkTenantSlugAvailability(value, companies = []) {
  const validated = validateTenantSlug(value);
  if (!validated.ok) return validated;

  const taken = companies.some(company =>
    company?.status !== 'released' &&
    normaliseTenantSlug(company?.slug) === validated.slug
  );
  if (taken) return { ok: false, code: 'taken', message: 'That branded URL is already in use.' };
  return validated;
}
