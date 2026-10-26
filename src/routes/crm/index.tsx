import { useCallback, useEffect, useState } from 'react';
type Org={id:string;name:string;role:string};
type Contact={id:string;display_name:string;email:string|null;company:string|null};
type Company={id:string;name:string;website:string|null};
type Activity={id:string;kind:string;details:string|null;created_at:number};
type Lead={id:string;title:string;stage:string;contact_name:string};
const stages=['new','qualified','proposal','negotiation','won','lost'];
async function api<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch('/api/crm'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options?.headers}});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'CRM request failed');
 return data as T;
}
export default function CrmPage(){
 const [orgs,setOrgs]=useState<Org[]>([]);
 const [org,setOrg]=useState('');
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [leads,setLeads]=useState<Lead[]>([]);
 const [companies,setCompanies]=useState<Company[]>([]);
 const [companyName,setCompanyName]=useState('');
 const [activityLead,setActivityLead]=useState('');
 const [activityKind,setActivityKind]=useState('note');
 const [activityDetails,setActivityDetails]=useState('');
 const [activities,setActivities]=useState<Activity[]>([]);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [company,setCompany]=useState('');
 const [orgName,setOrgName]=useState('');
 const [title,setTitle]=useState('');
 const [contactId,setContactId]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 // Reset all tenant-specific selections before any new organization can load.
 useEffect(()=>{
  setContacts([]);setLeads([]);setCompanies([]);
  setActivityLead('');setActivities([]);setContactId('');
  setActivityDetails('');setCompanyName('');setName('');setEmail('');setCompany('');setTitle('');
 },[org]);
 const selected=orgs.find(o=>o.id===org);
 const canWrite=selected && ['owner','admin','sales'].includes(selected.role);
 const refresh=useCallback(async()=>{if(!org){setContacts([]);setLeads([]);setCompanies([]);return;}const [c,l,co]=await Promise.all([api<{contacts:Contact[]}>('/'+org+'/contacts'),api<{leads:Lead[]}>('/'+org+'/leads'),api<{companies:Company[]}>('/'+org+'/companies')]);setContacts(c.contacts);setLeads(l.leads);setCompanies(co.companies);},[org]);
 useEffect(()=>{api<{organizations:Org[]}>('/organizations').then(r=>{setOrgs(r.organizations);setOrg(r.organizations[0]?.id??'')}).catch(e=>setError(String(e)))},[]);
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[refresh]);
 async function perform(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();await refresh()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 return <main style={{maxWidth:1100,margin:'2rem auto',padding:'1rem'}}>
  <h1>ROSALIOU TECH · CRM</h1>
  <p>Contactos, empresas y oportunidades comerciales por organización.</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <section><label>Organización <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">Seleccionar</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}</select></label>
   <form onSubmit={e=>{e.preventDefault();void perform(async()=>{const r=await api<{id:string}>('/organizations',{method:'POST',body:JSON.stringify({name:orgName})});setOrgs(prev=>[...prev,{id:r.id,name:orgName,role:'owner'}]);setOrg(r.id);setOrgName('')})}}>
    <input aria-label="Nueva organización" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Nueva organización" required/><button disabled={busy}>Crear organización</button>
   </form></section>
  {org&&<><section><h2>Empresas</h2>
   {canWrite&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{await api('/'+org+'/companies',{method:'POST',body:JSON.stringify({name:companyName})});setCompanyName('')})}}><input aria-label="Nombre de empresa" placeholder="Nombre de empresa" required value={companyName} onChange={e=>setCompanyName(e.target.value)}/><button disabled={busy}>Crear empresa</button></form>}
   <ul>{companies.map(c=><li key={c.id}>{c.name}</li>)}</ul>
  </section><section><h2>Contactos y empresas</h2>
   {canWrite&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{await api('/'+org+'/contacts',{method:'POST',body:JSON.stringify({displayName:name,...(email.trim()?{email:email.trim()}:{}),...(company.trim()?{company:company.trim()}: {})})});setName('');setEmail('');setCompany('')})}}>
    <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre" aria-label="Nombre de contacto" required/>
    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" aria-label="Email"/>
    <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Empresa" aria-label="Empresa"/>
    <button disabled={busy}>Guardar contacto</button>
   </form>}
   <table><thead><tr><th>Nombre</th><th>Empresa</th><th>Correo</th></tr></thead><tbody>{contacts.map(c=><tr key={c.id}><td>{c.display_name}</td><td>{c.company}</td><td>{c.email}</td></tr>)}</tbody></table>
  </section><section><h2>Oportunidades y seguimiento</h2>
   {canWrite&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{await api('/'+org+'/leads',{method:'POST',body:JSON.stringify({title,contactId})});setTitle('');setContactId('')})}}>
    <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Oportunidad" aria-label="Oportunidad" required/>
    <select aria-label="Contacto" required value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">Contacto</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select>
    <button disabled={busy}>Crear oportunidad</button>
   </form>}
   <table><thead><tr><th>Oportunidad</th><th>Contacto</th><th>Etapa</th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td>{l.title}</td><td>{l.contact_name}</td><td>{canWrite?<select aria-label={'Etapa de '+l.title} value={l.stage} disabled={busy} onChange={e=>{const stage=e.target.value;void perform(()=>api('/'+org+'/leads/'+l.id+'/stage',{method:'PATCH',body:JSON.stringify({stage})}))}}>{stages.map(s=><option key={s}>{s}</option>)}</select>:l.stage}</td></tr>)}</tbody></table>
  </section><section><h2>Seguimiento comercial</h2>
   <select aria-label="Oportunidad para seguimiento" value={activityLead} onChange={async e=>{const id=e.target.value;setActivityLead(id);setActivities([]);if(id)try{const r=await api<{activities:Activity[]}>('/'+org+'/leads/'+id+'/activities');setActivities(r.activities)}catch(err){setError(String(err))}}}><option value="">Seleccionar oportunidad</option>{leads.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>
   {canWrite&&activityLead&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{await api('/'+org+'/leads/'+activityLead+'/activities',{method:'POST',body:JSON.stringify({kind:activityKind,details:activityDetails})});const r=await api<{activities:Activity[]}>('/'+org+'/leads/'+activityLead+'/activities');setActivities(r.activities);setActivityDetails('')})}}><select aria-label="Tipo de actividad" value={activityKind} onChange={e=>setActivityKind(e.target.value)}>{['note','call','email','meeting','follow_up'].map(k=><option key={k}>{k}</option>)}</select><input aria-label="Detalle del seguimiento" value={activityDetails} onChange={e=>setActivityDetails(e.target.value)} placeholder="Detalle"/><button disabled={busy}>Registrar actividad</button></form>}
   <ul>{activities.map(a=><li key={a.id}>{new Date(a.created_at).toLocaleString()}: {a.kind} — {a.details}</li>)}</ul>
  </section></>}
 </main>;
}
