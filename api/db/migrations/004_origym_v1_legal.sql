-- OriGym Coach V1 legal documents and acceptance evidence. Runtime user IDs
-- are opaque text values, so this table intentionally does not reference the
-- unused UUID users table from the earlier foundation migration.
CREATE TABLE tenant_legal_acceptances (
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id, legal_document_id)
);

INSERT INTO legal_documents (organisation_id, document_type, version, content, published_at, created_by)
SELECT id, 'terms', 1, $terms$
# OriGym Coach Terms of Use — Draft for legal review

**Effective date:** 6 October 2026

These draft terms govern use of OriGym Coach, a workout-planning and progress-tracking service provided by OriGym. They are not a substitute for qualified legal review and may change before public launch.

## 1. The service

OriGym Coach helps users plan, record and review training. It provides general fitness information only. It is not medical advice, diagnosis or treatment. Users must seek appropriate professional advice before beginning or changing exercise where that is appropriate for them.

## 2. Accounts and acceptable use

Users must keep access to their account and device secure, provide accurate information, and use the service lawfully. They must not attempt to access another person’s account, disrupt the service, upload unlawful content, or misuse the service.

## 3. User content and data

Users keep ownership of the training information and media they submit. They give OriGym permission to store and process that material only as needed to operate, secure, support and improve OriGym Coach in line with the Privacy Notice.

## 4. Availability and changes

OriGym will take reasonable care in operating the service but does not guarantee that it will be uninterrupted or error-free. We may change, suspend or withdraw features where reasonably necessary, including for security, maintenance or legal reasons.

## 5. Liability

Nothing in these draft terms excludes liability that cannot legally be excluded. Subject to that, OriGym is not responsible for indirect or consequential loss arising from use of OriGym Coach, or for training decisions made by a user.

## 6. Ending access

Users may stop using OriGym Coach at any time. OriGym may suspend or end access for misuse, security reasons or where required by law. Account deletion requests are handled as described in the Privacy Notice.

## 7. Contact and governing law

Questions about these terms should be sent to tech@origym.co.uk. These terms are governed by the law of England and Wales, subject to any mandatory rights that apply to the user.
$terms$, now(), 'OriGym Coach draft'
FROM organisations WHERE slug = 'origym'
ON CONFLICT (organisation_id, document_type, version) DO NOTHING;

INSERT INTO legal_documents (organisation_id, document_type, version, content, published_at, created_by)
SELECT id, 'privacy', 1, $privacy$
# OriGym Coach Privacy Notice — Draft for legal review

**Effective date:** 6 October 2026

OriGym is the controller for OriGym Coach. Contact us at tech@origym.co.uk.

## Information we use

We process account details, passkey credential data, training plans and workout records, body-weight entries, optional uploaded exercise media, device/session security information, and support or audit records. We do not sell personal data.

## Why we use it

We use this information to provide the service, secure accounts, synchronise training information across a user’s devices, provide support, meet legal obligations and protect OriGym Coach from misuse. Where applicable, our legal bases include performance of a contract, legitimate interests in operating a secure service, legal obligations, and consent where requested.

## Sharing and storage

OriGym Coach is hosted using Google Cloud infrastructure. We use service providers only where needed to run the service and subject to appropriate contractual safeguards. We do not share training data with other students or trainers by default.

## Retention

We keep account and training information while an account remains active and for a limited period afterwards where required for support, security, legal obligations or dispute resolution. We will publish final retention periods before public launch.

## Your rights

Depending on the circumstances, users may ask for access, correction, deletion, restriction, portability or objection. Requests can be sent to tech@origym.co.uk. Users may also complain to the UK Information Commissioner’s Office.

## Changes

We will publish a new version before using information for a materially different purpose. Where required, we will ask users to review and accept updated terms.
$privacy$, now(), 'OriGym Coach draft'
FROM organisations WHERE slug = 'origym'
ON CONFLICT (organisation_id, document_type, version) DO NOTHING;
