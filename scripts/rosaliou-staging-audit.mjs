#!/usr/bin/env bun
/**
 * ROSALIOU TECH staging acceptance gate — READ ONLY.
 * Usage: bun scripts/rosaliou-staging-audit.mjs
 * No deployments, migrations, secret reads, deletions, or resource creation.
 */
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'jsonc-parser';
const file = process.argv[2] || 'wrangler.crm-staging.json';
let cfg;
try { cfg = parse(readFileSync(file, 'utf8')); }
catch (e) { console.error('BLOCKED: staging configuration missing or unreadable: ' + e.message); process.exit(1); }
const results = [];
const check = (name, ok, detail) => results.push({name, result:ok?'PASS':'BLOCKED', detail});
const staging = 'rosaliou-vibesdk-crm-staging';
const d1id='28c5c2f4-9198-4eaf-aa52-76050f6c8196';
const kvid='e35f74eb8f8746458c2d16e24e6fbaba';
check('Worker separado',cfg.name===staging,'No usar rosaliou-tech-ai-builder-lab ni vibesdk-production');
check('Dominio sin producción',cfg.workers_dev===true && !cfg.routes?.length && !cfg.route && !cfg.triggers?.routes?.length,'workers.dev únicamente');
const db=cfg.d1_databases?.find(x=>x.binding==='DB');
check('D1 staging',db?.database_id===d1id && db?.database_name==='rosaliou-vibesdk-crm-staging-db','Base confirmada en Cloudflare');
const kv=cfg.kv_namespaces?.find(x=>x.binding==='VibecoderStore');
check('KV staging',kv?.id===kvid,'KV confirmada en Cloudflare');
check('Assets SPA',cfg.assets?.directory==='dist/client' && cfg.assets?.binding==='ASSETS','Necesario para servir las pantallas');
check('Assets compilados',existsSync('dist/client'),'Ejecutar bun run build si no existe');
check('Node y alias',cfg.compatibility_flags?.includes('nodejs_compat') && !!cfg.alias?.['artifacts-viewer/server/cache'],'Evita errores del empaquetado');
const classes=['CodeGeneratorAgent','UserAppSandboxService','DORateLimitStore','UserSecretsStore','ThinkAgent','SpaceDO'];
const dos=(cfg.durable_objects?.bindings||[]).map(x=>x.class_name);
check('Durable Objects',classes.every(c=>dos.includes(c)),'Seis clases necesarias');
check('Migraciones DO',!!cfg.migrations?.length,'No confundir con migraciones D1');
check('Loader',!!cfg.worker_loaders?.some(x=>x.binding==='LOADER'),'App Builder genera Workers dinámicos');
check('Containers',!!cfg.containers?.some(x=>x.class_name==='UserAppSandboxService'),'Debe ser contenedor de staging');
const r2=cfg.r2_buckets?.find(x=>x.binding==='TEMPLATES_BUCKET');
check('R2 staging',!!r2 && /staging/i.test(r2.bucket_name),'Plantillas en bucket independiente');
const dispatch=cfg.dispatch_namespaces?.find(x=>x.binding==='DISPATCHER');
check('Dispatch staging',!!dispatch && /staging/i.test(dispatch.namespace) && dispatch.remote!==true,'Workers for Platforms independiente');
const artifacts=cfg.artifacts?.find(x=>x.binding==='ARTIFACTS');
check('Artifacts staging',!!artifacts && /staging/i.test(artifacts.namespace),'Repositorio/preview aislado');
check('IA y navegador',!!cfg.ai?.binding && !!cfg.browser?.binding,'Requiere revisar capacidad y costos');
const forbidden=['vibesdk-production','vibesdk-db','vibesdk-default-namespace','vibesdk-templates','vibesdk-gateway','build.cloudflare.dev','2101','2102','c4721a2b-b96a-428a-8b2a-b3d255b307e9','f066f3c2e4824981b48e8586c04db9c1'];
// A public GitHub source URL is not the production R2 bucket.
 // Check the named R2 binding directly and exclude ONLY that exact public source
 // from the legacy substring-based production scan.
const sourceUrl='https://github.com/cloudflare/vibesdk-templates';
const templateSourceOk=cfg.vars?.TEMPLATES_REPOSITORY === sourceUrl || !cfg.vars?.TEMPLATES_REPOSITORY;
const raw=JSON.stringify({...cfg,vars:{...cfg.vars,TEMPLATES_REPOSITORY: undefined}});
const prodMatches=forbidden.filter(x=>raw.includes(x));
const productionR2=(cfg.r2_buckets||[]).some(x=>x.bucket_name==='vibesdk-templates');
check('No usar recursos productivos',templateSourceOk && !productionR2 && prodMatches.length===0,
  'Escaneo de IDs y bindings reales de producción; URL pública de plantillas permitida');
check('Ningún dominio comercial',!cfg.vars?.CUSTOM_DOMAIN && !cfg.vars?.CUSTOM_PREVIEW_DOMAIN,'No enviar tráfico real');
check('Dispatch/Artifacts vars',!!cfg.vars?.DISPATCH_NAMESPACE && /staging/i.test(cfg.vars.DISPATCH_NAMESPACE) && !!cfg.vars?.ARTIFACTS_NAMESPACE && /staging/i.test(cfg.vars.ARTIFACTS_NAMESPACE),'Variables deben coincidir con bindings staging');
console.log('\nROSALIOU TECH — AUDITORÍA STAGING (sin cambios)\n');
for(const r of results) console.log((r.result==='PASS'?'[OK] ':'[FALTA] ')+r.name+' — '+r.detail);
const missing=results.filter(x=>x.result==='BLOCKED');
console.log('\nResultado: '+(results.length-missing.length)+'/'+results.length+' controles aprobados.');
if(missing.length){ console.log('DESPLIEGUE BLOQUEADO: completar recursos de staging y pruebas reales antes de fusionar PR o publicar.'); process.exit(1); }
console.log('PREFLIGHT COMPLETO: faltan aún despliegue, pruebas HTTP multi-organización y validación AI Builder; no publicar automáticamente.');
