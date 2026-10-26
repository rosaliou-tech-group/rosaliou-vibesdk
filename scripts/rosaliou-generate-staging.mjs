#!/usr/bin/env bun
/**
 * ROSALIOU staging config generator. LOCAL ONLY; never deploys, migrates or
 * creates resources. Rebuilds from an explicit allowlist; never copies any
 * production resource IDs, routes, rate limiters, secrets or account vars.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'jsonc-parser';
const target='wrangler.crm-staging.json';
const original=parse(readFileSync('wrangler.jsonc','utf8'));
if (!original?.main || !Array.isArray(original?.durable_objects?.bindings) ||
    !Array.isArray(original?.migrations) || !original?.assets ||
    !Array.isArray(original?.worker_loaders)) throw new Error('The upstream VibeSDK architecture is incomplete; abort.');
if (existsSync(target)) {
  const previous=parse(readFileSync(target,'utf8'));
  if(previous?.name!=='rosaliou-vibesdk-crm-staging') throw new Error('Refusing to overwrite any non-staging config');
}
const name='rosaliou-vibesdk-crm-staging';
const c={
  name,
  main: original.main,
  compatibility_date:original.compatibility_date,
  compatibility_flags:['nodejs_compat'],
  alias:original.alias,
  rules:original.rules,
  version_metadata:original.version_metadata,
  assets:original.assets,
  observability:original.observability,
  workers_dev:true,
  preview_urls:true,
  keep_vars:false,
  d1_databases:[{binding:'DB',database_name:'rosaliou-vibesdk-crm-staging-db',database_id:'28c5c2f4-9198-4eaf-aa52-76050f6c8196',migrations_dir:'migrations'}],
  kv_namespaces:[{binding:'VibecoderStore',id:'e35f74eb8f8746458c2d16e24e6fbaba'}],
  r2_buckets:[{binding:'TEMPLATES_BUCKET',bucket_name:'rosaliou-vibesdk-crm-staging-templates'}],
  dispatch_namespaces:[{binding:'DISPATCHER',namespace:'rosaliou-vibesdk-crm-staging-dispatch'}],
  artifacts:[{binding:'ARTIFACTS',namespace:'rosaliou-vibesdk-crm-staging-artifacts'}],
  durable_objects:original.durable_objects,
  migrations:original.migrations,
  worker_loaders:original.worker_loaders,
  containers:(original.containers||[]).map(x=>({
    class_name:x.class_name,image:'./SandboxDockerfile',
    max_instances:1,instance_type:x.instance_type,
    rollout_step_percentage:100,ssh:{enabled:false}
  })),
  ai:{binding:'AI'},
  browser:{binding:'BROWSER'},
  vars:{
    TEMPLATES_REPOSITORY:'https://github.com/cloudflare/vibesdk-templates',
    DISPATCH_NAMESPACE:'rosaliou-vibesdk-crm-staging-dispatch',
    ARTIFACTS_NAMESPACE:'rosaliou-vibesdk-crm-staging-artifacts',
    CLOUDFLARE_AI_GATEWAY:'rosaliou-vibesdk-crm-staging-gateway',
    CUSTOM_DOMAIN:'',CUSTOM_PREVIEW_DOMAIN:'',
    MAX_SANDBOX_INSTANCES:'1',SANDBOX_INSTANCE_TYPE:'standard-3',
    PLATFORM_CAPABILITIES:original.vars?.PLATFORM_CAPABILITIES || {features:{app:{enabled:true}},version:'1.0.0'}
  }
};
const data=JSON.stringify(c,null,2);
const forbidden=['vibesdk-production','vibesdk-default-namespace','build.cloudflare.dev','c4721a2b-b96a-428a-8b2a-b3d255b307e9','f066f3c2e4824981b48e8586c04db9c1'];
const matches=forbidden.filter(x=>data.includes(x));
if(matches.length)throw new Error('Production identifiers detected: '+matches.join(', '));
writeFileSync(target,data+'\n','utf8');
console.log('GENERATED '+target+' (local only; cloud resources NOT created).');
console.log('Next: bun scripts/rosaliou-staging-audit.mjs');
