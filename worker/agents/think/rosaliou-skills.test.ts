import { describe, expect, it } from 'vitest';
import { createThinkSkillSource } from './skills';

describe('ROSALIOU Think skills', () => {
  it('creates a skill source', () => {
    expect(createThinkSkillSource()).toBeDefined();
  });
});
