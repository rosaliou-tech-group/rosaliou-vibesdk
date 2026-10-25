# ROSALIOU TECH AI Builder + CRM — functional release contract

Status: IMPLEMENTATION / LIVE ACCEPTANCE PENDING. This document is a specification, not evidence of a working deployment.

## Scope and architecture
- Reuse the existing VibeSDK React UI, ThinkAgent, SpaceDO project workspaces, Dynamic Worker previews, Artifacts version history and configured AI Gateway. Do not replace these with the Cloudflare lab Hello World worker.
- CRM must be tenant-scoped and backed by server-enforced authorization. No CRM client may supply a trusted organization ID or role without server verification.
- Proposed CRM records: Organization, Membership, Contact, Lead, Opportunity, Activity, ProjectLink. IDs are opaque. Each record has organizationId, createdAt, updatedAt; mutation events have actorId and immutable audit metadata.
- Roles: owner, admin, sales, member, viewer. Server authorization is mandatory on read/write/export, not just hidden UI.
- CRM UI: dashboard; contacts; leads and pipeline; activities; project links; organization settings; audit and export.
- Builder UI: sign in; workspace/project list; prompt/chat; generated files; preview; revisions; export. Treat publish/deploy as a separate explicitly confirmed operation.
- Billing, payments, WhatsApp messaging, Meta and production connectors remain disabled in the isolated acceptance environment.

## Mandatory functional acceptance (real evidence required)
| ID | Test | Pass condition |
|---|---|---|
| AUTH-01 | Register/login/logout and session expiry | Only authenticated user sees private resources; expired session rejected |
| TEN-01 | Two test organizations A/B | A cannot read, mutate or export B records, projects or artifacts; API returns 403/404 |
| CRM-01 | Create, edit, search, delete test contact | State persists after reload; validation and authorization enforced |
| CRM-02 | Move lead through pipeline | History/activity recorded; permissions enforced |
| CRM-03 | Link CRM opportunity to builder project | Link belongs to same tenant and broken links are handled |
| AI-01 | Ask ThinkAgent to build a fictional booking app | Agent produces editable files and an observable completion/error state |
| PRE-01 | Open preview and inspect browser logs | Working preview, no runtime errors for agreed happy path |
| REV-01 | Revise generated app and restore prior version | History and rollback work without cross-tenant leakage |
| EXP-01 | Export test app | Export contains only permitted project content |
| SAFE-01 | Request unauthorized third-party clone | No proprietary assets or private endpoints accessed |
| SAFE-02 | Inspect Cloudflare logs and deployments | No unexpected production writes, payments, messages or deploys |
| OPS-01 | Observe costs and error logs | Test spending controlled and errors actionable |

## Release blockers
1. A dedicated non-production Cloudflare deployment with required VibeSDK bindings, Worker Loader, Durable Objects, Artifacts, database migrations and AI Gateway/provider configuration.
2. Test identities and two independent test organizations.
3. CRM schema/API/UI implementation with server-side organization isolation.
4. Evidence for every acceptance case (date, revision, test account alias, screenshots/logs, result).
5. Manual approval before merge or production deployment.

## Operator checklist
- Preserve existing `rosaliou-tech-ai-builder-lab.rosalioun.workers.dev` Hello World as a separate diagnostic Worker.
- Never paste API tokens or provider keys into GitHub issues, commits, screenshots or this checklist.
- Do not connect a production GitHub auto-deploy to this draft branch.
- A passing GitHub CI is necessary but not sufficient: mark live acceptance BLOCKED until exercised in the Cloudflare test environment.
