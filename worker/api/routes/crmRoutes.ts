import { Hono } from 'hono';
import type { AppEnv } from '../../types/appenv';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';
import { z } from 'zod';
import { crmContactInputSchema, crmLeadInputSchema, crmLeadStageSchema } from '../../crm/domain';

type Role = 'owner' | 'admin' | 'sales' | 'member' | 'viewer';
const writers: Role[] = ['owner', 'admin', 'sales'];
const admins: Role[] = ['owner', 'admin'];
const companyInputSchema=z.object({name:z.string().trim().min(1).max(160),website:z.string().trim().max(500).optional(),notes:z.string().trim().max(4000).optional()}).strict();
const activityInputSchema=z.object({kind:z.enum(['call','email','meeting','note','follow_up']),details:z.string().trim().max(4000).optional()}).strict();
const contactPatchSchema=crmContactInputSchema.partial();
const companyPatchSchema=companyInputSchema.partial();

export function setupCrmRoutes(app: Hono<AppEnv>): void {
  const router = new Hono<AppEnv>();
  router.use('*', setAuthLevel(AuthConfig.authenticated));
  const db = (c: any): D1Database => c.env.DB;
  const uid = (c: any): string => c.get('user')?.id;
  const scope = async (c: any, write = false, admin = false) => {
    const org = c.req.param('orgId');
    const member = await db(c).prepare('SELECT role FROM crm_memberships WHERE organization_id=? AND user_id=? AND active=1').bind(org, uid(c)).first<{role: Role}>();
    if (!member || (write && !writers.includes(member.role)) || (admin && !admins.includes(member.role))) return null;
    return org as string;
  };
  router.get('/organizations', async c => {
    const { results } = await db(c).prepare('SELECT o.id,o.name,m.role FROM crm_organizations o JOIN crm_memberships m ON m.organization_id=o.id WHERE m.user_id=? AND m.active=1 ORDER BY o.name').bind(uid(c)).all();
    return c.json({ organizations: results });
  });
  router.post('/organizations', async c => {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return c.json({ error: 'Invalid organization name' }, 400);
    const id = crypto.randomUUID();
    await db(c).batch([
      db(c).prepare('INSERT INTO crm_organizations(id,name,created_at) VALUES(?,?,?)').bind(id,name,Date.now()),
      db(c).prepare('INSERT INTO crm_memberships(organization_id,user_id,role,active) VALUES(?,?,?,1)').bind(id,uid(c),'owner'),
    ]);
    return c.json({ id, name }, 201);
  });
  router.get('/:orgId/contacts', async c => {
    const org = await scope(c); if (!org) return c.json({ error:'Forbidden' },403);
    const { results } = await db(c).prepare('SELECT * FROM crm_contacts WHERE organization_id=? ORDER BY updated_at DESC LIMIT 200').bind(org).all();
    return c.json({ contacts: results });
  });
  router.post('/:orgId/contacts', async c => {
    const org = await scope(c,true); if (!org) return c.json({ error:'Forbidden' },403);
    const b = await c.req.json().catch(() => ({})) as Record<string,unknown>;
    const parsed=crmContactInputSchema.safeParse(b);
    if(!parsed.success)return c.json({error:'Invalid contact data'},400);
    const v=parsed.data;
    const id=crypto.randomUUID(),now=Date.now();
    await db(c).prepare('INSERT INTO crm_contacts(id,organization_id,display_name,email,phone,company,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(id,org,v.displayName,v.email??null,v.phone??null,v.company??null,v.notes??null,now,now).run();
    return c.json({ id },201);
  });
  router.patch('/:orgId/contacts/:id', async c => {
    const org=await scope(c,true); if(!org) return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=contactPatchSchema.safeParse(b);
    if(!parsed.success || !Object.keys(parsed.data).length)return c.json({error:'Invalid changes'},400);
    const columns:Record<string,string>={displayName:'display_name',email:'email',phone:'phone',company:'company',notes:'notes'};
    const entries=Object.entries(parsed.data);
    const result=await db(c).prepare('UPDATE crm_contacts SET '+entries.map(([k])=>columns[k]+'=?').join(',')+',updated_at=? WHERE id=? AND organization_id=?')
      .bind(...entries.map(([,v])=>v),Date.now(),c.req.param('id'),org).run();
    return c.json({updated:result.meta.changes>0});
  });
  router.get('/:orgId/leads', async c => {
    const org=await scope(c);if(!org)return c.json({error:'Forbidden'},403);
    const {results}=await db(c).prepare('SELECT l.*,c.display_name AS contact_name FROM crm_leads l JOIN crm_contacts c ON c.id=l.contact_id AND c.organization_id=l.organization_id WHERE l.organization_id=? ORDER BY l.updated_at DESC LIMIT 200').bind(org).all();
    return c.json({leads:results});
  });
  router.post('/:orgId/leads', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=crmLeadInputSchema.safeParse({...b,stage:b.stage??'new'});
    if(!parsed.success)return c.json({error:'Invalid lead'},400);
    const v=parsed.data;
    const contact=await db(c).prepare('SELECT id FROM crm_contacts WHERE id=? AND organization_id=?').bind(v.contactId,org).first();
    if(!contact)return c.json({error:'Contact not found in organization'},404);
    const id=crypto.randomUUID(),now=Date.now();
    await db(c).prepare('INSERT INTO crm_leads(id,organization_id,contact_id,title,stage,amount_minor,currency,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(id,org,v.contactId,v.title,v.stage,v.amountMinor??null,v.currency??null,now,now).run();
    return c.json({id},201);
  });
  router.patch('/:orgId/leads/:id/stage', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=z.object({stage:crmLeadStageSchema}).strict().safeParse(b);
    if(!parsed.success)return c.json({error:'Invalid stage'},400);
    const lead=await db(c).prepare('SELECT stage FROM crm_leads WHERE id=? AND organization_id=?').bind(c.req.param('id'),org).first<{stage:string}>();
    if(!lead)return c.json({error:'Lead not found'},404);
    if(lead.stage===parsed.data.stage)return c.json({updated:false});
    const now=Date.now();
    await db(c).batch([
      db(c).prepare('UPDATE crm_leads SET stage=?,updated_at=? WHERE id=? AND organization_id=?').bind(parsed.data.stage,now,c.req.param('id'),org),
      db(c).prepare('INSERT INTO crm_activities(id,organization_id,lead_id,actor_id,kind,details,created_at) VALUES(?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),org,c.req.param('id'),uid(c),'stage_change',lead.stage+' -> '+parsed.data.stage,now)
    ]);
    return c.json({updated:true});
  });

  router.get('/:orgId/companies', async c => {
    const org=await scope(c);if(!org)return c.json({error:'Forbidden'},403);
    const {results}=await db(c).prepare('SELECT * FROM crm_companies WHERE organization_id=? ORDER BY updated_at DESC LIMIT 200').bind(org).all();
    return c.json({companies:results});
  });
  router.post('/:orgId/companies', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=companyInputSchema.safeParse(b);
    if(!parsed.success)return c.json({error:'Invalid company'},400);
    const v=parsed.data,id=crypto.randomUUID(),now=Date.now();
    await db(c).prepare('INSERT INTO crm_companies(id,organization_id,name,website,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
      .bind(id,org,v.name,v.website??null,v.notes??null,now,now).run();
    return c.json({id},201);
  });
  router.patch('/:orgId/companies/:id', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=companyPatchSchema.safeParse(b);
    if(!parsed.success||!Object.keys(parsed.data).length)return c.json({error:'Invalid changes'},400);
    const entries=Object.entries(parsed.data);
    const result=await db(c).prepare('UPDATE crm_companies SET '+entries.map(([k])=>k+'=?').join(',')+',updated_at=? WHERE id=? AND organization_id=?')
      .bind(...entries.map(([,v])=>v),Date.now(),c.req.param('id'),org).run();
    return c.json({updated:result.meta.changes>0});
  });
  router.get('/:orgId/leads/:id/activities', async c => {
    const org=await scope(c);if(!org)return c.json({error:'Forbidden'},403);
    const lead=await db(c).prepare('SELECT id FROM crm_leads WHERE id=? AND organization_id=?').bind(c.req.param('id'),org).first();
    if(!lead)return c.json({error:'Lead not found'},404);
    const {results}=await db(c).prepare('SELECT id,lead_id,actor_id,kind,details,created_at FROM crm_activities WHERE organization_id=? AND lead_id=? ORDER BY created_at DESC LIMIT 200').bind(org,c.req.param('id')).all();
    return c.json({activities:results});
  });
  router.post('/:orgId/leads/:id/activities', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const parsed=activityInputSchema.safeParse(b);
    if(!parsed.success)return c.json({error:'Invalid activity'},400);
    const lead=await db(c).prepare('SELECT id FROM crm_leads WHERE id=? AND organization_id=?').bind(c.req.param('id'),org).first();
    if(!lead)return c.json({error:'Lead not found'},404);
    const id=crypto.randomUUID();
    await db(c).prepare('INSERT INTO crm_activities(id,organization_id,lead_id,actor_id,kind,details,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(id,org,c.req.param('id'),uid(c),parsed.data.kind,parsed.data.details??null,Date.now()).run();
    return c.json({id},201);
  });

  app.route('/api/crm',router);
}
