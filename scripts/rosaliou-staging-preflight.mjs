#!/usr/bin/env node
/**
 * Fail-closed staging deployment preflight.
 * Usage: node scripts/rosaliou-staging-preflight.mjs path/to/staging.wrangler.json
 * This script NEVER deploys, migrates, creates resources, or reads credentials.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = process.argv[2];
if (!path) {
  console.error('BLOCKED: supply a dedicated staging Wrangler JSON config path.');
  process.exit(1);
}
let config;
try {
  config = JSON.parse(readFileSync(resolve(path), 'utf8'));
} catch {
  console.error('BLOCKED: cannot parse staging config as strict JSON.');
  process.exit(1);
}
const errors = [];
const require = (ok, message) => { if (!ok) errors.push(message); };
const name = config.name || '';
require(/rosaliou.*staging/i.test(name), 'Worker name must identify ROSALIOU staging.');
require(config.workers_dev === true, 'Staging workers_dev must be true.');
require(!config.routes || config.routes.length === 0, 'Staging must not configure production routes.');
require(!config.route, 'Staging must not configure a custom route.');
require(!config.triggers?.routes?.length, 'Staging must not configure trigger routes.');
require(config.preview_urls !== false, 'Staging preview URLs must not be explicitly disabled.');
const db = config.d1_databases?.find(x => x.binding === 'DB');
require(!!db, 'Staging requires a dedicated D1 DB binding.');
require(!!db?.database_id && db.database_id !== 'c4721a2b-b96a-428a-8b2a-b3d255b307e9', 'Staging D1 ID must exist and differ from production.');
require(!!db?.database_name && /staging/i.test(db.database_name), 'Staging D1 name must include staging.');
for (const b of config.kv_namespaces || []) {
  require(!!b.id && b.id !== 'f066f3c2e4824981b48e8586c04db9c1', 'Staging KV must have a distinct ID.');
}
for (const b of config.r2_buckets || []) require(/staging/i.test(b.bucket_name || ''), 'R2 bucket must be staging-only.');
for (const b of config.dispatch_namespaces || []) require(/staging/i.test(b.namespace || '') && b.remote !== true, 'Dispatch namespace must be staging-only and not remote production.');
for (const b of config.artifacts || []) require(/staging/i.test(b.namespace || ''), 'Artifacts namespace must be staging-only.');
require(!config.vars?.DISPATCH_NAMESPACE || /staging/i.test(config.vars.DISPATCH_NAMESPACE), 'Dispatch variable must be staging-only.');
require(!config.vars?.ARTIFACTS_NAMESPACE || /staging/i.test(config.vars.ARTIFACTS_NAMESPACE), 'Artifacts variable must be staging-only.');
require(!config.vars?.CUSTOM_DOMAIN, 'No custom domain in staging.');
const unsafe = JSON.stringify(config);
require(!unsafe.includes('build.cloudflare.dev'), 'Production domain detected.');
require(!unsafe.includes('vibesdk-production'), 'Production artifacts or worker name detected.');
require(!unsafe.includes('vibesdk-default-namespace'), 'Production dispatch namespace detected.');
require(!unsafe.includes('vibesdk-templates'), 'Production R2 bucket detected.');
require(!unsafe.includes('vibesdk-gateway'), 'Production AI gateway detected.');
require(!unsafe.includes('2101') && !unsafe.includes('2102'), 'Production rate-limit namespace detected.');
if (errors.length) {
  console.error('STAGING BLOCKED:\n' + errors.map(e => '- ' + e).join('\n'));
  process.exit(1);
}
console.log('Static staging preflight PASSED. This does NOT verify resources exist or authorize deployment.');
