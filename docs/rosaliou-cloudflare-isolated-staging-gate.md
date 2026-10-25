# ROSALIOU isolated Cloudflare CRM + AI Builder staging — deployment gate

Status: PREPARED IN GIT ONLY; NOT DEPLOYED. Never treat CI green as end-to-end acceptance.

## Confirmed risk in existing config
The repository root `wrangler.jsonc` targets `vibesdk-production` and references existing D1 database ID, R2, KV, dispatch namespace, artifacts, container service, routes and remote AI/browser bindings. **Do not use `wrangler deploy`, `bun run deploy` or `bun run db:migrate:remote` with this root config for staging.** The Cloudflare diagnostic Worker `rosaliou-tech-ai-builder-lab` is a separate Hello World service and must not be overwritten.

## Provision isolated resources (operator-controlled, not yet executed)
1. Create a distinct Cloudflare Worker name, e.g. `rosaliou-vibesdk-crm-staging`, with no custom domain, production route or auto-deploy.
2. Create a NEW D1 database `rosaliou-vibesdk-crm-staging-db`. Record its generated database ID privately; never substitute the production ID.
3. Allocate separate staging-only KV, R2, artifacts namespace, dispatch namespace, container resources and any required Durable Objects/Worker Loader support. If any dependency cannot be isolated, stop rather than binding a production resource.
4. Generate a dedicated Wrangler staging config from the reviewed production config, replacing **every** resource name/ID and removing production routes. Set `workers_dev` only for staging. Never commit tokens.
5. Store staging-only secrets in Cloudflare's secret store. Disable real payments, WhatsApp, Meta sends, customer data and outbound commercial actions. Limit AI budgets.
6. Run migrations ONLY against the newly created staging D1 using an explicit staging config and remote database target; verify `crm_organizations`, `crm_memberships`, `crm_contacts`, `crm_leads`, `crm_companies`, `crm_activities` and migration history.
7. Deploy to the staging Worker only, verify the deployed revision, then create two fictional users and two independent organizations.

## Acceptance evidence (must record HTTP status and persisted result)
- Anonymous request to CRM: 401.
- Org A owner: create/edit/read contacts and companies, leads and activities; reload and verify persistence.
- Org B user: cannot read/write/export Org A records (403/404); viewer cannot mutate.
- Invalid contact/company/lead payloads: 400; no mass assignment of organization or role.
- Commercial stages and activity timeline remain consistent after reload.
- Builder flow: create fictional app, preview, edit, restore and export; verify project linkage cannot cross tenant.
- Confirm logs, rate limits, errors and costs. No production deployment, billing, WhatsApp or real customer effects.

## Release decision
Until actual staging deployment and all evidence above exist: BLOCKED. PR #1 must not be merged on CI status alone. Production deployment requires separate explicit approval.
