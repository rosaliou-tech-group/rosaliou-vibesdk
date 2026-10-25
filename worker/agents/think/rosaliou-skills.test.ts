import { describe, expect, it } from 'vitest';
import catalog from './skills.ts?raw';
import agent from './ThinkAgent.ts?raw';
import recon from './skills/rosaliou-recon-pilot/SKILL.md?raw';
import architecture from './skills/rosaliou-architecture-pilot/SKILL.md?raw';
import design from './skills/rosaliou-design-pilot/SKILL.md?raw';

const skills = [
  ['rosaliou-recon-pilot', 'ROSALIOU_RECON_PILOT', recon],
  ['rosaliou-architecture-pilot', 'ROSALIOU_ARCHITECTURE_PILOT', architecture],
  ['rosaliou-design-pilot', 'ROSALIOU_DESIGN_PILOT', design],
] as const;

describe('ROSALIOU Think skill integration', () => {
  it('registers each pilot in the manifest with valid frontmatter and a body', () => {
    for (const [name, symbol, content] of skills) {
      expect(catalog).toContain(`'${name}': ${symbol}`);
      expect(content.startsWith('---\n')).toBe(true);
      expect(content).toContain(`name: ${name}`);
      expect(content).toMatch(/description: [^\n]+/);
      expect(content).toMatch(/\n---\n#[^\n]+/);
    }
    expect(catalog).toContain('return fromManifest(manifest)');
  });

  it('connects the manifest source to ThinkAgent getSkills', () => {
    expect(agent).toContain("import { createThinkSkillSource } from './skills'");
    expect(agent).toContain('override getSkills(): SkillSource[]');
    expect(agent).toContain('return [createThinkSkillSource()]');
  });

  it('keeps the pilot skills guidance-only and sandbox-first', () => {
    for (const [, , content] of skills) {
      expect(content.toLowerCase()).toContain('sandbox');
      expect(content).toMatch(/production|live services/i);
    }
  });
});
