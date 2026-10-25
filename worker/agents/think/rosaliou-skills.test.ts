import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Test the skill catalog without importing the runtime-only agents/skills bundle.
// That bundle depends on a just-bash browser submodule unavailable in Vitest.
const catalog = readFileSync(fileURLToPath(new URL('./skills.ts', import.meta.url)), 'utf8');
const names = ['rosaliou-recon-pilot', 'rosaliou-architecture-pilot', 'rosaliou-design-pilot'];

describe('ROSALIOU Think skill catalog', () => {
  it('registers the three pilot skills', () => {
    for (const name of names) {
      expect(catalog).toContain(`'${name}':`);
      const skill = readFileSync(fileURLToPath(new URL(`./skills/${name}/SKILL.md`, import.meta.url)), 'utf8');
      expect(skill).toContain(`name: ${name}`);
      expect(skill).toContain('description:');
    }
  });
});
