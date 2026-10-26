#!/usr/bin/env bun
/**
 * Generate a complete, production-isolated staging Wrangler config.
 * READS root wrangler.jsonc and WRITES ONLY wrangler.crm-staging.json.
 * Never creates resources, deploys, migrates, or accesses credentials.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'jsonc-parser';
const source='wrangler.jsonc',target='wrangler.crm-staging.json';
if(!existsSync(source)) throw new Error('Run from repository root.');
const c=parse(readFileSync(source,'utf8'));
if(!c || !Array.isArray(c.durable_objects?.bindings)) throw new Error('Unexpected original config: missing Durable Objects; aborting.');
if(existsSync(target)) {
 const old=parse(readFileSync(target,'utf8'));
 if(old?.name!=='rosaliou-vibesdk-crm-staging') throw new Error('Refusing to overwrite a non-staging config');
}
c.name='rosaliou-vibesdk-crm-staging';
c.workers_dev=true;
c.preview_urls=true;
delete c.routes;delete c.route;delete c.triggers;
delete c.unsafe; // production rate limiter namespace IDs
c.keep_vars=false; // do not preserve dashboard vars from any other Worker
c.d1_databases=[{binding:'DB',database_name:'rosaliou-vibesdk-crm-staging-db',database_id:'28c5c2f4-9198-4eaf-aa52-76050f6c8196',migrations_dir:'migrations'}];
c.kv_namespaces=[{binding:'VibecoderStore',id:'e35f74eb8f8746458c2d16e24e6fbaba'}];
c.r2_buckets=[{binding:'TEMPLATES_BUCKET',bucket_name:'rosaliou-vibesdk-crm-staging-templates'}];
c.dispatch_namespaces=[{binding:'DISPATCHER',namespace:'rosaliou-vibesdk-crm-staging-dispatch'}];
c.artifacts=[{binding:'ARTIFACTS',namespace:'rosaliou-vibesdk-crm-staging-artifacts'}];
c.vars={...c.vars,DISPATCH_NAMESPACE:'rosaliou-vibesdk-crm-staging-dispatch',ARTIFACTS_NAMESPACE:'rosaliou-vibesdk-crm-staging-artifacts',CLOUDFLARE_AI_GATEWAY:'rosaliou-vibesdk-crm-staging-gateway',CUSTOM_DOMAIN:'',CUSTOM_PREVIEW_DOMAIN:'',MAX_SANDBOX_INSTANCES:'1',SANDBOX_INSTANCE_TYPE:'standard-3'};
delete c.vars.DEV_BROWSER_SIDECAR_URL;
delete c.vars.DEV_BROWSER_PREVIEW_ORIGIN;
// AI / browser configuration from upstream must be reviewed before live functional tests.
delete c.ai?.remote;delete c.browser?.remote;
if(c.containers?.length) c.containers=c.containers.map(x=>({...x,max_instances:1,ssh:{enabled:false}}));
// Keep original staging-exclusive Durable Object classes, migration history,
// alias, Markdown bundling, version metadata, loader and static SPA assets.
if(!c.assets || !c.worker_loaders || !c.migrations || !c.durable_objects) throw new Error('Missing required upstream VibeSDK architecture; abort.');
const raw=JSON.stringify(c,null,2);
const unsafe=['vibesdk-production','vibesdk-default-namespace','build.cloudflare.dev','c4721a2b-b96a-428a-8b2a-b3d255b307e9','f066f3c2e4824981b48e8586c04db9c1','2101','2102'];
// The public templates SOURCE repository legitimately contains "vibesdk-templates"
 // in its URL; it is not the production R2 bucket. Check that binding exactly.
if(c.r2_buckets.some(x=>x.bucket_name==='vibesdk-templates'))throw new Error('Production R2 bucket detected. Refusing to write.');
const matches=unsafe.filter(x=>raw.includes(x));
if(matches.length)throw new Error('Production identifiers remain in staging configuration: '+matches.join(', ')+'. Refusing to write.');
writeFileSync(target,raw+'\n','utf8');
console.log('Created '+target+' using isolated resource names. No cloud resources created and no deployments performed.');
console.log('Next: bun scripts/rosaliou-staging-audit.mjs');
