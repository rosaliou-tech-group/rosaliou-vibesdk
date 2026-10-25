import { describe, expect, it } from 'vitest';
import catalog from './skills.ts?raw';
import recon from './skills/rosaliou-recon-pilot/SKILL.md?raw';
import architecture from './skills/rosaliou-architecture-pilot/SKILL.md?raw';
import design from './skills/rosaliou-design-pilot/SKILL.md?raw';

describe('ROSALIOU Think skill catalog', () => {
  it('registers each pilot skill with valid metadata', () => {
    const skills = [
      ['rosaliou-recon-pilot', recon],
      ['rosaliou-architecture-pilot', architecture],
      ['rosaliou-design-pilot', design],
    ] as const;
    for (const [name, content] of skills) {
      expect(catalog).toContain(`'${name}':`);
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain('description:');
    }
  });
});
