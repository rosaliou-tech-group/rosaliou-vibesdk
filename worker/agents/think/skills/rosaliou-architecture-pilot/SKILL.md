---
name: rosaliou-architecture-pilot
description: Plan an original ROSALIOU application from an authorized recon map using existing Cloudflare and VibeSDK architecture.
---
# ROSALIOU Architecture Pilot

Use only after the user approves a scoped feature map. Prefer the existing Cloudflare Worker, Durable Objects, and established VibeSDK storage and authentication patterns; do not introduce a second backend without justification.

1. List required user journeys and data entities with confidence and source evidence.
2. Design tenant-isolated authorization and ownership checks for every data access.
3. Define public, documented API routes, input validation, rate limits, and audit logging.
4. Separate sandbox secrets and resources from production.
5. Plan the smallest end-to-end vertical slice, acceptance tests, rollback, and migration strategy.
6. Flag privacy, intellectual-property, payments, and regulated-services risks for review.

Deliver a proposed architecture, not a deployment. Do not modify production resources or send payments or communications. Never use undocumented third-party endpoints or secrets from screenshots.
