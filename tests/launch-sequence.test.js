/**
 * Launch Sequence Tests (Phase 6.1)
 *
 * Tests for:
 *   - Under-the-wire detection logic (timeLeft < 120)
 *   - endRun() options passing to outro scene
 *   - _launching guard preventing double-endRun on timer expiry
 *   - OutroScene init() underTheWire state assignment
 *   - Share card text construction for victory state
 *
 * No Phaser import — all logic is tested via plain-object mocks.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Group 1 — Under-the-wire detection logic ─────────────────────────────────
//
// Inlined from src/scenes/game.js finishScene() — keep in sync:
//   const underTheWire = timeLeft < 120;

const isUnderTheWire = (timeLeft) => timeLeft < 120;

describe('Under-the-wire detection', () => {
  it('timeLeft=119 → underTheWire is true', () => {
    expect(isUnderTheWire(119)).toBe(true);
  });

  it('timeLeft=120 → underTheWire is false (boundary: exactly 2 min is NOT under the wire)', () => {
    expect(isUnderTheWire(120)).toBe(false);
  });

  it('timeLeft=0 → underTheWire is true (timer expired with no time left)', () => {
    expect(isUnderTheWire(0)).toBe(true);
  });

  it('timeLeft=3600 → underTheWire is false (full time remaining)', () => {
    expect(isUnderTheWire(3600)).toBe(false);
  });
});

// ── Group 2 — endRun() options passing ───────────────────────────────────────
//
// Inlined from src/scenes/game.js endRun():
//   endRun(state, options = {}) {
//     this.scene.stop("hud");
//     this.scene.start("outro", { state, underTheWire: options.underTheWire ?? false });
//   }

function makeGameScene() {
  const scene = {
    _launching: false,
    scene: {
      stop: vi.fn(),
      start: vi.fn(),
    },
  };

  scene.endRun = function (state, options = {}) {
    this.scene.stop('hud');
    this.scene.start('outro', { state, underTheWire: options.underTheWire ?? false });
  };

  return scene;
}

describe('endRun() options passing', () => {
  it('victory + underTheWire:true → scene.start called with { state:"victory", underTheWire:true }', () => {
    const scene = makeGameScene();
    scene.endRun('victory', { underTheWire: true });

    expect(scene.scene.stop).toHaveBeenCalledWith('hud');
    expect(scene.scene.start).toHaveBeenCalledWith('outro', {
      state: 'victory',
      underTheWire: true,
    });
  });

  it('victory + empty options → underTheWire defaults to false', () => {
    const scene = makeGameScene();
    scene.endRun('victory', {});

    expect(scene.scene.start).toHaveBeenCalledWith('outro', {
      state: 'victory',
      underTheWire: false,
    });
  });

  it('timeout with no options arg → { state:"timeout", underTheWire:false }', () => {
    const scene = makeGameScene();
    scene.endRun('timeout');

    expect(scene.scene.start).toHaveBeenCalledWith('outro', {
      state: 'timeout',
      underTheWire: false,
    });
  });

  it('victory + underTheWire:false → underTheWire is false (explicit false preserved)', () => {
    const scene = makeGameScene();
    scene.endRun('victory', { underTheWire: false });

    expect(scene.scene.start).toHaveBeenCalledWith('outro', {
      state: 'victory',
      underTheWire: false,
    });
  });
});

// ── Group 3 — _launching guard ───────────────────────────────────────────────
//
// Inlined from src/scenes/game.js listenForGameOver():
//   const onExpired = (parent, value) => {
//     if (this._launching) return;
//     if (value === true) this.endRun("timeout");
//   };

function makeGameSceneWithGuard() {
  const scene = makeGameScene();

  // Mirror the onExpired closure from listenForGameOver(), bound to `scene`
  scene._onExpired = function (parent, value) {
    if (scene._launching) return;
    if (value === true) scene.endRun('timeout');
  };

  return scene;
}

describe('_launching guard in timerExpired handler', () => {
  it('_launching=true → endRun is NOT called when timer fires', () => {
    const scene = makeGameSceneWithGuard();
    scene._launching = true;

    scene._onExpired(null, true);

    expect(scene.scene.start).not.toHaveBeenCalled();
  });

  it('_launching=false → endRun("timeout") IS called when timer fires', () => {
    const scene = makeGameSceneWithGuard();
    scene._launching = false;

    scene._onExpired(null, true);

    expect(scene.scene.start).toHaveBeenCalledWith('outro', {
      state: 'timeout',
      underTheWire: false,
    });
  });

  it('_launching=false but value=false → endRun is NOT called (guard on value)', () => {
    const scene = makeGameSceneWithGuard();
    scene._launching = false;

    scene._onExpired(null, false);

    expect(scene.scene.start).not.toHaveBeenCalled();
  });
});

// ── Group 4 — OutroScene init() underTheWire handling ────────────────────────
//
// Inlined from src/scenes/outro.js init():
//   init(data) {
//     this.state = data.state || "death";
//     this.underTheWire = data.underTheWire ?? false;
//   }

function makeOutroScene() {
  const scene = {
    state: null,
    underTheWire: null,
  };

  scene.init = function (data) {
    this.state = data.state || 'death';
    this.underTheWire = data.underTheWire ?? false;
  };

  return scene;
}

describe('OutroScene init() — underTheWire assignment', () => {
  it('{ state:"victory", underTheWire:true } → this.underTheWire === true', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'victory', underTheWire: true });
    expect(scene.underTheWire).toBe(true);
  });

  it('{ state:"victory", underTheWire:false } → this.underTheWire === false', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'victory', underTheWire: false });
    expect(scene.underTheWire).toBe(false);
  });

  it('{ state:"victory" } (key absent) → this.underTheWire defaults to false', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'victory' });
    expect(scene.underTheWire).toBe(false);
  });

  it('{ state:"death" } → this.underTheWire is false (non-victory state)', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'death' });
    expect(scene.underTheWire).toBe(false);
  });
});

// ── Group 5 — Share card text ─────────────────────────────────────────────────
//
// Inlined from src/scenes/outro.js addShareCard():
//   const stateLabel = this.state === "victory"
//     ? `Escaped Hurricane Kendra in ${this.formatTime(this.elapsed)} with ${this.xp} XP.${this.underTheWire ? ' Under the Wire!' : ''}`
//     : ...;

function buildShareCardText(state, underTheWire, elapsed, xp) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (state === 'victory') {
    return `Escaped Hurricane Kendra in ${formatTime(elapsed)} with ${xp} XP.${underTheWire ? ' Under the Wire!' : ''}`;
  } else if (state === 'timeout') {
    return `Survived ${formatTime(elapsed)} before Hurricane Kendra made landfall.`;
  } else {
    return `Survived ${formatTime(elapsed)} and earned ${xp} XP before going down.`;
  }
}

describe('Share card text — Under the Wire suffix', () => {
  it('victory + underTheWire:true → text contains "Under the Wire!"', () => {
    const text = buildShareCardText('victory', true, 3480, 90);
    expect(text).toContain('Under the Wire!');
  });

  it('victory + underTheWire:false → text does NOT contain "Under the Wire!"', () => {
    const text = buildShareCardText('victory', false, 3480, 90);
    expect(text).not.toContain('Under the Wire!');
  });

  it('victory + underTheWire:true → text still contains escape narrative prefix', () => {
    const text = buildShareCardText('victory', true, 3480, 90);
    expect(text).toContain('Escaped Hurricane Kendra in');
  });

  it('victory + underTheWire:false → text still contains escape narrative prefix', () => {
    const text = buildShareCardText('victory', false, 3480, 90);
    expect(text).toContain('Escaped Hurricane Kendra in');
  });

  it('non-victory state (timeout) → text never contains "Under the Wire!" regardless of flag', () => {
    const text = buildShareCardText('timeout', true, 1800, 0);
    expect(text).not.toContain('Under the Wire!');
  });
});
