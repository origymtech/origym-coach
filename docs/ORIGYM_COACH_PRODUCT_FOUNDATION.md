# OriGym Coach: product foundation

## Product address

- Platform: `coach.origym.co.uk`
- Trainer version: `<brand-slug>.coach.origym.co.uk`
- Example: `fitwithsam.coach.origym.co.uk`
- Custom trainer-owned domains are not part of the first release.

## Branded URL rule

A trainer company claims one unique `brandSlug`.

- Maximum: 10 characters.
- No spaces.
- Allowed: lowercase letters, numbers and internal hyphens.
- The platform lowercases the requested label before checking it.
- A claimed label cannot be edited. A company can change its display name, logo and colours without changing client links.
- Active and suspended companies retain their label.
- Deleted companies release their label only after the retention/deletion policy permits it.
- Reserved platform labels cannot be claimed: `admin`, `api`, `app`, `assets`, `coach`, `help`, `legal`, `origym`, `privacy`, `status`, `support`, `terms`, `www`.
- The availability check runs in the database transaction that creates the company. The on-screen check is only a convenience; it is not the final decision.

## Roles

| Role | Scope | Can do |
| --- | --- | --- |
| OriGym platform admin | All companies | Create, suspend, support and audit companies; publish OriGym legal documents |
| Company owner | One company | Branding, trainers, clients, company legal documents |
| Trainer | One company | Invite and manage assigned clients; create programmes |
| Client | Own account | Complete workouts and manage own data |

## First-release boundaries

- One hosted, multi-tenant product. No per-trainer infrastructure.
- Every request resolves the company from the hostname and authorises it server-side.
- Production tenant runtime and training-state records are stored in PostgreSQL.
- Company logo/media will go in Cloud Storage, not PostgreSQL.
- Terms and privacy notices are immutable versions. Record the company, user, document type, version, timestamp and document hash when accepted.
- Do not add medical, injury or nutrition-data collection in the first release.

## Production PostgreSQL model

```text
organisations
  id, slug, name, logo_url, primary_colour, status

tenant_runtime
  organisation_id, runtime JSONB, session_secret, vapid JSONB

tenant_state_documents
  organisation_id, user_id, revision, state JSONB

legal_documents
  organisation_id, document_type, version, content, published_at

tenant_legal_acceptances
  organisation_id, user_id, legal_document_id, accepted_at
```

## First technical milestones

1. Company/brand registry and hostname resolution.
2. Master OriGym dashboard and company creation journey.
3. Trainer, client and permission model.
4. PostgreSQL runtime adapter and migration away from JSON files.
5. Branded sign-in and client onboarding.
6. Legal-document publishing and acceptance controls.
