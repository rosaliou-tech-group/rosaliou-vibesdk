import { z } from 'zod';

/**
 * ROSALIOU CRM domain contracts.
 * These schemas are deliberately not exposed as HTTP routes until authenticated
 * organization membership checks and persistent storage are wired up.
 */
export const crmRoleSchema = z.enum(['owner', 'admin', 'sales', 'member', 'viewer']);
export type CrmRole = z.infer<typeof crmRoleSchema>;

export const crmContactInputSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict();

export const crmLeadStageSchema = z.enum([
  'new', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
]);

export const crmLeadInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  contactId: z.string().uuid(),
  stage: crmLeadStageSchema,
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
}).strict();

export type CrmMembership = {
  userId: string;
  organizationId: string;
  role: CrmRole;
  active: boolean;
};

export type CrmRecord = {
  organizationId: string;
};

export type CrmAction = 'read' | 'write' | 'manageMembers' | 'export';

const rolePermissions: Record<CrmRole, ReadonlySet<CrmAction>> = {
  owner: new Set(['read', 'write', 'manageMembers', 'export']),
  admin: new Set(['read', 'write', 'manageMembers', 'export']),
  sales: new Set(['read', 'write']),
  member: new Set(['read']),
  viewer: new Set(['read']),
};

/**
 * Pass only a membership resolved from a trusted server-side identity and
 * membership lookup. NEVER construct it from client-provided role/org fields.
 */
export function canAccessCrmRecord(
  membership: CrmMembership | null,
  record: CrmRecord,
  action: CrmAction,
): boolean {
  if (!membership?.active) return false;
  if (membership.organizationId !== record.organizationId) return false;
  return rolePermissions[membership.role]?.has(action) ?? false;
}

export function assertCrmAccess(
  membership: CrmMembership | null,
  record: CrmRecord,
  action: CrmAction,
): void {
  if (!canAccessCrmRecord(membership, record, action)) {
    throw new Error('CRM_ACCESS_DENIED');
  }
}
