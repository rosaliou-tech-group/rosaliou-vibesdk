-- Additive tenant-scoped companies and commercial activities for isolated staging D1.
CREATE TABLE IF NOT EXISTS crm_companies (
 id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL REFERENCES crm_organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL, website TEXT, notes TEXT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_companies_org_idx ON crm_companies(organization_id);
CREATE TABLE IF NOT EXISTS crm_activities (
 id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL REFERENCES crm_organizations(id) ON DELETE CASCADE,
 lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, kind TEXT NOT NULL, details TEXT,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_activities_org_lead_idx ON crm_activities(organization_id,lead_id,created_at);
