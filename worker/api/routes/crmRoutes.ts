import { Hono } from 'hono';
import type { AppEnv } from '../../types/appenv';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

type Role = 'owner' | 'admin' | 'sales' | 'member' | 'viewer';
const writers: Role[] = ['owner', 'admin', 'sales'];
const admins: Role[] = ['owner', 'admin'];
const stages = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

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
    const name = typeof b.displayName === 'string' ? b.displayName.trim() : '';
    if (!name || name.length > 200) return c.json({ error:'Invalid contact name' },400);
    const val=(x:unknown)=>typeof x==='string'?x.trim().slice(0,1000):null;
    const id=crypto.randomUUID(),now=Date.now();
    await db(c).prepare('INSERT INTO crm_contacts(id,organization_id,display_name,email,phone,company,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(id,org,name,val(b.email),val(b.phone),val(b.company),val(b.notes),now,now).run();
    return c.json({ id },201);
  });
  router.patch('/:orgId/contacts/:id', async c => {
    const org=await scope(c,true); if(!org) return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    const keys=['displayName','email','phone','company','notes'] as const;
    const columns:Record<string,string>={displayName:'display_name',email:'email',phone:'phone',company:'company',notes:'notes'};
    const selected=keys.filter(k=>Object.prototype.hasOwnProperty.call(b,k));
    if(!selected.length) return c.json({error:'No changes'},400);
    if(selected.some(k=>b[k]!==null && typeof b[k]!=='string')) return c.json({error:'Invalid fields'},400);
    if(selected.includes('displayName') && !String(b.displayName??'').trim()) return c.json({error:'Name required'},400);
    const sql='UPDATE crm_contacts SET '+selected.map(k=>columns[k]+'=?').join(',')+',updated_at=? WHERE id=? AND organization_id=?';
    const result=await db(c).prepare(sql).bind(...selected.map(k=>b[k]===null?null:String(b[k]).trim().slice(0,1000)),Date.now(),c.req.param('id'),org).run();
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
    const title=typeof b.title==='string'?b.title.trim():'';
    if(!title || title.length>200 || typeof b.contactId!=='string' || !stages.includes(String(b.stage??'new'))) return c.json({error:'Invalid lead'},400);
    const contact=await db(c).prepare('SELECT id FROM crm_contacts WHERE id=? AND organization_id=?').bind(b.contactId,org).first();
    if(!contact)return c.json({error:'Contact not found in organization'},404);
    const id=crypto.randomUUID(),now=Date.now();
    await db(c).prepare('INSERT INTO crm_leads(id,organization_id,contact_id,title,stage,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,org,b.contactId,title,b.stage??'new',now,now).run();
    return c.json({id},201);
  });
  router.patch('/:orgId/leads/:id/stage', async c => {
    const org=await scope(c,true);if(!org)return c.json({error:'Forbidden'},403);
    const b=await c.req.json().catch(()=>({})) as Record<string,unknown>;
    if(!stages.includes(String(b.stage)))return c.json({error:'Invalid stage'},400);
    const result=await db(c).prepare('UPDATE crm_leads SET stage=?,updated_at=? WHERE id=? AND organization_id=?').bind(b.stage,Date.now(),c.req.param('id'),org).run();
    return c.json({updated:result.meta.changes>0});
  });
  app.route('/api/crm',router);
}
