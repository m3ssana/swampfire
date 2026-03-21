import { describe, it, expect } from 'vitest';
import { getWindDrift } from '../src/gameobjects/storm_phase_logic.js';

describe('getWindDrift', () => {
  it('returns 0 for phase 1 (no wind)', () => {
    expect(getWindDrift(1)).toBe(0);
  });

  it('returns 0 for phase 2 (no wind)', () => {
    expect(getWindDrift(2)).toBe(0);
  });

  it('returns 0.8 for phase 3 (noticeable drift)', () => {
    expect(getWindDrift(3)).toBe(0.8);
  });

  it('returns 1.5 for phase 4 (strong drift)', () => {
    expect(getWindDrift(4)).toBe(1.5);
  });

  it('returns 0 for undefined phase (defensive)', () => {
    expect(getWindDrift(undefined)).toBe(0);
  });

  it('returns 0 for an out-of-range phase value (defensive)', () => {
    expect(getWindDrift(0)).toBe(0);
    expect(getWindDrift(5)).toBe(0);
    expect(getWindDrift(-1)).toBe(0);
  });
});
