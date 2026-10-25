-- Additive CRM tables for an isolated test environment.
-- Do NOT apply to production before tenant isolation/API acceptance tests.
CREATE TABLE IF NOT EXISTS crm_organizations (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS crm_memberships (
 organization_id TEXT NOT NULL REFERENCES crm_organizations(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('owner','admin','sales','member','viewer')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_memberships_org_user_idx ON crm_memberships(organization_id,user_id);
CREATE INDEX IF NOT EXISTS crm_memberships_user_idx ON crm_memberships(user_id);
CREATE TABLE IF NOT EXISTS crm_contacts (
 id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL REFERENCES crm_organizations(id) ON DELETE CASCADE,
 display_name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, notes TEXT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_contacts_org_idx ON crm_contacts(organization_id);
CREATE TABLE IF NOT EXISTS crm_leads (
 id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL REFERENCES crm_organizations(id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES crm_contacts(id),
 title TEXT NOT NULL,
 stage TEXT NOT NULL CHECK(stage IN ('new','qualified','proposal','negotiation','won','lost')),
 amount_minor INTEGER CHECK(amount_minor IS NULL OR amount_minor >= 0),
 currency TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_leads_org_idx ON crm_leads(organization_id);
