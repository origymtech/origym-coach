-- Compatibility store used while openGym's file-backed profile model is moved
-- into PostgreSQL. Every record is keyed by organisation, preventing a host
-- from reading or writing another trainer's users or workout history.

CREATE TABLE tenant_runtime (
  organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  runtime JSONB NOT NULL DEFAULT '{"users":[],"creds":[],"subs":[],"invites":[],"deviceLinks":[]}'::jsonb,
  session_secret TEXT NOT NULL,
  vapid JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_state_documents (
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);

CREATE INDEX tenant_state_documents_tenant_idx ON tenant_state_documents (organisation_id);

-- The protected platform tenant is only a staging bootstrap. Real trainer
-- companies are inserted by the management dashboard and resolved by hostname.
INSERT INTO organisations (slug, name, created_by)
VALUES ('origym', 'OriGym Coach', 'bootstrap')
ON CONFLICT (slug) DO NOTHING;
