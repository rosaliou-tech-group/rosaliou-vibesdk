import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from '../database/schema';

/** CRM tables are additive; all reads/writes must scope by verified membership. */
export const crmOrganizations = sqliteTable('crm_organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const crmMemberships = sqliteTable('crm_memberships', {
  organizationId: text('organization_id').notNull().references(() => crmOrganizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'admin', 'sales', 'member', 'viewer'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
}, t => ({
  membershipUnique: uniqueIndex('crm_memberships_org_user_idx').on(t.organizationId, t.userId),
  userIndex: index('crm_memberships_user_idx').on(t.userId),
}));

export const crmContacts = sqliteTable('crm_contacts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => crmOrganizations.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => ({ organizationIndex: index('crm_contacts_org_idx').on(t.organizationId) }));

export const crmLeads = sqliteTable('crm_leads', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => crmOrganizations.id, { onDelete: 'cascade' }),
  contactId: text('contact_id').notNull().references(() => crmContacts.id),
  title: text('title').notNull(),
  stage: text('stage', { enum: ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] }).notNull(),
  amountMinor: integer('amount_minor'),
  currency: text('currency'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => ({ organizationIndex: index('crm_leads_org_idx').on(t.organizationId) }));
