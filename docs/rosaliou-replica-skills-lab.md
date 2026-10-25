# ROSALIOU Replica Skills — integration laboratory

Status: preparation only. No third-party skill is installed or enabled by this change.

## Existing integration points

- `worker/agents/think/skills.ts`: the current skill catalog, using raw SKILL.md imports, parseSkillMarkdown, and fromManifest.
- `worker/agents/think/ThinkAgent.ts`: ThinkAgent.getSkills() returns the catalog.
- `worker/agents/think/skills/`: existing skill directories and SKILL.md files.
- `space/`: workspace and preview runtime. Do not bypass SpaceDO isolation.

## Safe integration sequence

1. Verify the exact upstream repository URL, commit, and license of Replica Skills. Do not assume the translated GitHub screenshot is a verified source.
2. Inspect every SKILL.md and any referenced scripts, external URLs, commands, dependencies, and prompt-injection risks.
3. Inventory which skills only provide guidance and which require executable tools. VibeSDK has workspace bash disabled; do not enable it to accommodate upstream instructions.
4. Select one non-destructive, guidance-only skill for a pilot. Adapt its wording and metadata to the existing Think skill catalog; keep attribution and license where required.
5. Register the pilot skill in `worker/agents/think/skills.ts` only after review. Preserve all existing skills.
6. Run typecheck, lint, unit tests, and a sandbox-only agent session; verify tenant isolation and that no external deployment or messaging occurs.
7. Open a draft PR for review. Do not merge or deploy without explicit approval.

## Safety boundaries

- Do not change Cloudflare credentials, Workers deployment, production routes, billing, Meta WhatsApp, ROSALIOU PAY, or Base44.
- Do not import or execute unreviewed third-party scripts.
- Do not copy proprietary applications or assets. Implement only authorized functionality.
- No claims of free unlimited AI inference; API and infrastructure charges may apply.
