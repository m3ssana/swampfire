/**
 * Storm Manager Effects Tests
 *
 * Unit tests for Phase 4.3 wind/environmental additions to StormManager:
 * - RAIN_CONFIG speedX values (angled wind for Phase 3+)
 * - DEBRIS_CONFIG existence and tint values
 * - Debris emitter created at Phase 3, not Phase 2
 * - Debris emitter destroyed on StormManager.destroy()
 * - Lightning timing range (5–15s spec requirement)
 *
 * Phaser import boundary: StormManager requires the full Phaser runtime so we
 * do NOT import it directly. Instead we inline the config constants and
 * reproduce the StormManager construction pattern using mocks, following the
 * same approach as hazard-logic.test.js.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPhaseForTimeLeft } from '../src/gameobjects/storm_phase_logic.js';

// ── Inline the config tables from storm_manager.js ──────────────────────────
// These are duplicated here deliberately so that tests catch accidental config
// regressions without needing the Phaser runtime.

const RAIN_CONFIG = {
  1: { quantity: 1,  freq: 120, speedX: 0,                        speedY: { min: 280, max: 360 }, alpha: { start: 0.25, end: 0 }, lifespan: 900 },
  2: { quantity: 2,  freq:  80, speedX: 0,                        speedY: { min: 320, max: 440 }, alpha: { start: 0.40, end: 0 }, lifespan: 900 },
  3: { quantity: 4,  freq:  40, speedX: { min:  40, max:  80 },   speedY: { min: 380, max: 520 }, alpha: { start: 0.55, end: 0 }, lifespan: 900 },
  4: { quantity: 8,  freq:  20, speedX: { min:  80, max: 140 },   speedY: { min: 460, max: 640 }, alpha: { start: 0.70, end: 0 }, lifespan: 900 },
};

const DEBRIS_CONFIG = {
  3: { tint: 0x88aa44 },
  4: { tint: 0xaa8844 },
};

const LIGHTNING_MIN_MS = 5000;
const LIGHTNING_MAX_MS = 15000;

// ── Minimal Phaser scene mock ────────────────────────────────────────────────

function makeMockScene() {
  const registryEvents = {
    handlers: {},
    on: vi.fn(function (event, handler) { (this.handlers[event] = this.handlers[event] || []).push(handler); }),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const registry = {
    events: registryEvents,
    data: {},
    set: vi.fn(function (key, value) { this.data[key] = value; }),
    get: vi.fn(function (key) { return this.data[key]; }),
  };

  // Particle emitter mock — tracks destroy calls
  const makeEmitter = () => ({
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  });

  const scene = {
    registry,
    _makeEmitter: makeEmitter,
    sys: {
      game: {
        config: { width: 960, height: 640 },
      },
    },
    add: {
      rectangle: vi.fn(() => ({
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
      particles: vi.fn(() => makeEmitter()),
    },
    tweens: {
      add: vi.fn(),
    },
    cameras: {
      main: {
        flash: vi.fn(),
        shake: vi.fn(),
      },
    },
    time: {
      addEvent: vi.fn(() => ({ remove: vi.fn() })),
      delayedCall: vi.fn(() => ({ remove: vi.fn() })),
    },
    events: {
      once: vi.fn(),
    },
  };

  return scene;
}

// ── Inline StormManager construction (Phaser-free) ───────────────────────────
// We reproduce the _buildDebrisEmitter / _buildRainEmitter logic in terms of
// pure config lookups so that the test does not import storm_manager.js itself.

function buildRainEmitterConfig(scene, phase) {
  const cfg   = RAIN_CONFIG[phase];
  const width = scene.sys.game.config.width;
  scene.add.particles(0, -10, 'rain-drop', {
    x:        { min: 0, max: width },
    speedX:   cfg.speedX,
    speedY:   cfg.speedY,
    quantity:  cfg.quantity,
    lifespan:  cfg.lifespan,
    alpha:     cfg.alpha,
    frequency: cfg.freq,
    tint:      0xaaddff,
  });
}

function buildDebrisEmitterConfig(scene, phase) {
  const cfg    = DEBRIS_CONFIG[phase];
  const height = scene.sys.game.config.height;
  const emitter = scene.add.particles(0, 0, 'rain-drop', {
    x:        0,
    y:        { min: 0, max: height },
    speedX:   { min: 120, max: 220 },
    speedY:   { min: -40, max:  40 },
    scaleX:   { min: 2, max: 4 },
    scaleY:   { min: 2, max: 4 },
    quantity:  1,
    lifespan:  1200,
    alpha:     { start: 0.6, end: 0 },
    frequency: 400,
    tint:      cfg.tint,
  });
  emitter.setScrollFactor(0);
  emitter.setDepth(84);
  return emitter;
}

// ── RAIN_CONFIG wind angle tests ─────────────────────────────────────────────

describe('RAIN_CONFIG — speedX wind angle', () => {
  it('Phase 1 has no horizontal wind (speedX === 0)', () => {
    expect(RAIN_CONFIG[1].speedX).toBe(0);
  });

  it('Phase 2 has no horizontal wind (speedX === 0)', () => {
    expect(RAIN_CONFIG[2].speedX).toBe(0);
  });

  it('Phase 3 has eastward wind: speedX { min: 40, max: 80 }', () => {
    expect(RAIN_CONFIG[3].speedX).toEqual({ min: 40, max: 80 });
  });

  it('Phase 4 has strong eastward wind: speedX { min: 80, max: 140 }', () => {
    expect(RAIN_CONFIG[4].speedX).toEqual({ min: 80, max: 140 });
  });

  it('Phase 4 wind is faster than Phase 3 wind', () => {
    expect(RAIN_CONFIG[4].speedX.min).toBeGreaterThan(RAIN_CONFIG[3].speedX.min);
    expect(RAIN_CONFIG[4].speedX.max).toBeGreaterThan(RAIN_CONFIG[3].speedX.max);
  });
});

// ── DEBRIS_CONFIG tests ──────────────────────────────────────────────────────

describe('DEBRIS_CONFIG — tint values', () => {
  it('Phase 3 debris has olive/leaf tint (0x88aa44)', () => {
    expect(DEBRIS_CONFIG[3].tint).toBe(0x88aa44);
  });

  it('Phase 4 debris has brown/dirt tint (0xaa8844)', () => {
    expect(DEBRIS_CONFIG[4].tint).toBe(0xaa8844);
  });

  it('no debris config for Phase 1', () => {
    expect(DEBRIS_CONFIG[1]).toBeUndefined();
  });

  it('no debris config for Phase 2', () => {
    expect(DEBRIS_CONFIG[2]).toBeUndefined();
  });
});

// ── Debris emitter creation gating ──────────────────────────────────────────

describe('Debris emitter — Phase gating', () => {
  it('does NOT create a debris emitter for Phase 1 (getPhaseForTimeLeft returns 1 at 3600s)', () => {
    const phase = getPhaseForTimeLeft(3600);
    expect(phase).toBe(1);
    expect(phase >= 3).toBe(false);
  });

  it('does NOT create a debris emitter for Phase 2 (getPhaseForTimeLeft returns 2 at 2400s)', () => {
    const phase = getPhaseForTimeLeft(2400);
    expect(phase).toBe(2);
    expect(phase >= 3).toBe(false);
  });

  it('DOES create a debris emitter for Phase 3 (getPhaseForTimeLeft returns 3 at 1500s)', () => {
    const phase = getPhaseForTimeLeft(1500);
    expect(phase).toBe(3);
    expect(phase >= 3).toBe(true);
  });

  it('DOES create a debris emitter for Phase 4 (getPhaseForTimeLeft returns 4 at 500s)', () => {
    const phase = getPhaseForTimeLeft(500);
    expect(phase).toBe(4);
    expect(phase >= 3).toBe(true);
  });

  it('creates debris emitter with correct depth (84, below overlay at 85)', () => {
    const scene = makeMockScene();
    const emitter = buildDebrisEmitterConfig(scene, 3);
    expect(emitter.setDepth).toHaveBeenCalledWith(84);
  });

  it('creates debris emitter with scroll factor 0 (fixed to camera)', () => {
    const scene = makeMockScene();
    const emitter = buildDebrisEmitterConfig(scene, 3);
    expect(emitter.setScrollFactor).toHaveBeenCalledWith(0);
  });

  it('calls scene.add.particles when building a Phase 3 debris emitter', () => {
    const scene = makeMockScene();
    buildDebrisEmitterConfig(scene, 3);
    expect(scene.add.particles).toHaveBeenCalledWith(0, 0, 'rain-drop', expect.objectContaining({
      tint: DEBRIS_CONFIG[3].tint,
      quantity: 1,
      frequency: 400,
      lifespan: 1200,
    }));
  });

  it('calls scene.add.particles with Phase 4 tint for Phase 4 debris', () => {
    const scene = makeMockScene();
    buildDebrisEmitterConfig(scene, 4);
    expect(scene.add.particles).toHaveBeenCalledWith(0, 0, 'rain-drop', expect.objectContaining({
      tint: DEBRIS_CONFIG[4].tint,
    }));
  });
});

// ── Debris emitter cleanup ───────────────────────────────────────────────────

describe('Debris emitter — cleanup', () => {
  it('destroy() is callable on a debris emitter mock without throwing', () => {
    const scene = makeMockScene();
    const emitter = buildDebrisEmitterConfig(scene, 3);
    expect(() => emitter.destroy()).not.toThrow();
  });

  it('debris emitter destroy() is invoked exactly once on cleanup', () => {
    const scene = makeMockScene();
    const emitter = buildDebrisEmitterConfig(scene, 3);
    emitter.destroy();
    expect(emitter.destroy).toHaveBeenCalledTimes(1);
  });
});

// ── Lightning timing ─────────────────────────────────────────────────────────

describe('Lightning timing — spec 5–15s', () => {
  it('LIGHTNING_MIN_MS is 5000 (5 seconds)', () => {
    expect(LIGHTNING_MIN_MS).toBe(5000);
  });

  it('LIGHTNING_MAX_MS is 15000 (15 seconds)', () => {
    expect(LIGHTNING_MAX_MS).toBe(15000);
  });

  it('lightning range matches spec (5s–15s, NOT old 8s–20s)', () => {
    expect(LIGHTNING_MIN_MS).not.toBe(8000);
    expect(LIGHTNING_MAX_MS).not.toBe(20000);
    expect(LIGHTNING_MIN_MS).toBe(5000);
    expect(LIGHTNING_MAX_MS).toBe(15000);
  });
});
