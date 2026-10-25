import { describe, expect, it } from 'vitest';
import {
  assertCrmAccess, canAccessCrmRecord, crmContactInputSchema, crmLeadInputSchema,
  type CrmMembership,
} from './domain';

const member: CrmMembership = {
  userId: 'user-a', organizationId: 'org-a', role: 'sales', active: true,
};

describe('ROSALIOU CRM domain security', () => {
  it('blocks cross-organization reads, writes and exports', () => {
    for (const action of ['read', 'write', 'export'] as const) {
      expect(canAccessCrmRecord(member, { organizationId: 'org-b' }, action)).toBe(false);
      expect(() => assertCrmAccess(member, { organizationId: 'org-b' }, action)).toThrow('CRM_ACCESS_DENIED');
    }
  });
  it('blocks inactive and unauthenticated membership', () => {
    expect(canAccessCrmRecord(null, { organizationId: 'org-a' }, 'read')).toBe(false);
    expect(canAccessCrmRecord({ ...member, active: false }, { organizationId: 'org-a' }, 'read')).toBe(false);
  });
  it('enforces roles within the same organization', () => {
    expect(canAccessCrmRecord(member, { organizationId: 'org-a' }, 'write')).toBe(true);
    expect(canAccessCrmRecord(member, { organizationId: 'org-a' }, 'export')).toBe(false);
    expect(canAccessCrmRecord({ ...member, role: 'viewer' }, { organizationId: 'org-a' }, 'write')).toBe(false);
    expect(canAccessCrmRecord({ ...member, role: 'owner' }, { organizationId: 'org-a' }, 'export')).toBe(true);
  });
  it('validates contact fields and refuses mass assignment', () => {
    expect(crmContactInputSchema.safeParse({ displayName: 'Test Client', email: 'test@example.com' }).success).toBe(true);
    expect(crmContactInputSchema.safeParse({ displayName: 'Test', organizationId: 'org-b' }).success).toBe(false);
    expect(crmContactInputSchema.safeParse({ displayName: '' }).success).toBe(false);
  });
  it('validates lead stage and amount', () => {
    const valid = { title: 'Test deal', contactId: 'a98b74cb-1b30-4edb-9b72-1c75a92bc055', stage: 'new' };
    expect(crmLeadInputSchema.safeParse(valid).success).toBe(true);
    expect(crmLeadInputSchema.safeParse({ ...valid, stage: 'invalid' }).success).toBe(false);
    expect(crmLeadInputSchema.safeParse({ ...valid, amountMinor: -1 }).success).toBe(false);
  });
});
