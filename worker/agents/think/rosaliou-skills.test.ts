import { describe, expect, it } from 'vitest';
import { createThinkSkillSource } from './skills';

describe('ROSALIOU Think skills', () => {
  it('creates a skill source with the registered manifest', () => {
    const source = createThinkSkillSource();
    expect(source).toBeDefined();
  });
});
