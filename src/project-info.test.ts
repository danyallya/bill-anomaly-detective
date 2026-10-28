import { describe, expect, it } from 'vitest';
import { projectInfo } from './project-info';

describe('Bill Anomaly Detective project contract', () => {
  it('keeps locale and direction aligned', () => {
    expect(projectInfo.slug).toBe('bill-anomaly-detective');
    expect(projectInfo.direction).toBe(projectInfo.locale.startsWith('fa') ? 'rtl' : 'ltr');
    expect(projectInfo.firstTask.length).toBeGreaterThan(8);
  });
});
