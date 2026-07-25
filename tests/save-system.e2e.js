/**
 * Save System E2E Tests (Issue #98)
 *
 * Playwright stubs for end-to-end verification of the save system.
 * These test the actual game running in the browser with localStorage.
 *
 * All tests are test.skip() — they define acceptance criteria that will
 * be unskipped once the save system is implemented and integrated into scenes.
 */

import { test, expect } from '@playwright/test';

// ── Helper: wait for the game scene to be active ──────────────────────────────

async function waitForGameReady(page) {
  await page.waitForFunction(
    () => window.game?.scene?.getScene('game')?.sys?.settings?.active,
    { timeout: 15000 }
  );
}

// ── Helper: skip past the transition/splash screens to get into gameplay ──────

async function skipToGameplay(page) {
  await page.goto('/');
  // Wait for Phaser to initialise
  await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });

  // Press SPACE to advance through each transition phase (up to 5 times to cover all phases)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
  }

  await waitForGameReady(page);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group 1 — Auto-save triggers
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — auto-save triggers', () => {
  test.skip('auto-saves when player returns to Zone 0', async ({ page }) => {
    await skipToGameplay(page);

    // Move player to another zone then back to Zone 0
    // After returning, localStorage should contain a save
    const hasSave = await page.evaluate(() => {
      return localStorage.getItem('swampfire_save') !== null;
    });
    expect(hasSave).toBe(true);
  });

  test.skip('auto-saves when a rocket system is installed', async ({ page }) => {
    await skipToGameplay(page);

    // Trigger a system installation via game API
    await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('systemsInstalled', 1);
    });

    await page.waitForTimeout(200);

    const hasSave = await page.evaluate(() => {
      return localStorage.getItem('swampfire_save') !== null;
    });
    expect(hasSave).toBe(true);
  });

  test.skip('auto-saves on storm phase transition', async ({ page }) => {
    await skipToGameplay(page);

    // Force a phase change by setting timeLeft to cross the phase 1→2 boundary
    await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('timeLeft', 2699);
      game.registry.set('stormPhase', 2);
    });

    await page.waitForTimeout(200);

    const hasSave = await page.evaluate(() => {
      return localStorage.getItem('swampfire_save') !== null;
    });
    expect(hasSave).toBe(true);
  });

  test.skip('auto-saves every 5 minutes (interval trigger)', async ({ page }) => {
    await skipToGameplay(page);

    // Clear any existing save
    await page.evaluate(() => localStorage.removeItem('swampfire_save'));

    // Fast-forward the autosave timer (mock or adjust game time)
    // This requires the game to expose a way to force the interval trigger
    await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      if (game._autoSaveTimer) {
        game._autoSaveTimer.elapsed = 300000; // force elapsed to 5 min
      }
    });

    await page.waitForTimeout(500);

    const hasSave = await page.evaluate(() => {
      return localStorage.getItem('swampfire_save') !== null;
    });
    expect(hasSave).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 2 — Save data completeness
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — data completeness', () => {
  test.skip('save contains position, zone, HP, inventory, rocket state, timer, XP, achievements, quest progress', async ({ page }) => {
    await skipToGameplay(page);

    // Force a save trigger
    await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('systemsInstalled', 1);
    });

    await page.waitForTimeout(200);

    const saveData = await page.evaluate(() => {
      const raw = localStorage.getItem('swampfire_save');
      return raw ? JSON.parse(raw) : null;
    });

    expect(saveData).not.toBeNull();
    expect(saveData.version).toBe(1);
    expect(saveData.state).toBeDefined();
    expect(saveData.state.position).toBeDefined();
    expect(saveData.state.zone).toBeDefined();
    expect(saveData.state.hp).toBeDefined();
    expect(saveData.state.inventory).toBeDefined();
    expect(saveData.state.systemsInstalled).toBeDefined();
    expect(saveData.state.timeLeft).toBeDefined();
    expect(saveData.state.xp).toBeDefined();
    expect(saveData.state.achievements).toBeDefined();
    expect(saveData.state.npcQuests).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 3 — CONTINUE button in MenuScene
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — CONTINUE button', () => {
  test.skip('MenuScene shows CONTINUE button when save exists in localStorage', async ({ page }) => {
    // Pre-seed localStorage with a valid save before loading the game
    await page.goto('/');
    await page.evaluate(() => {
      const validSave = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: {
          position: { x: 1920, y: 2496 },
          zone: 0,
          hp: 3,
          xp: 100,
          timeLeft: 3000,
          timerExpired: false,
          inventory: ['branch'],
          systemsInstalled: 1,
          stormPhase: 1,
          npcQuests: { harvey: false, maria: false, dale: false, reeves: false },
          visitedZones: [0, 1],
          achievements: ['first_loot'],
        },
      });
      localStorage.setItem('swampfire_save', validSave);
    });

    // Reload to pick up the save
    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });

    // Check that the MenuScene/Splash shows a CONTINUE option
    const hasContinue = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      return splash?._continueButton?.visible === true;
    });
    expect(hasContinue).toBe(true);
  });

  test.skip('MenuScene does NOT show CONTINUE button when no save exists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('swampfire_save'));
    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });

    const hasContinue = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      return splash?._continueButton?.visible === true;
    });
    expect(hasContinue).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 4 — CONTINUE resumes exactly where left off
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — resume from save', () => {
  test.skip('CONTINUE resumes with correct timer value', async ({ page }) => {
    await page.goto('/');
    // Pre-seed save with timeLeft=2100 (35 min remaining)
    await page.evaluate(() => {
      const save = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: {
          position: { x: 1920, y: 2496 },
          zone: 0,
          hp: 2,
          xp: 500,
          timeLeft: 2100,
          timerExpired: false,
          inventory: ['branch', 'copper_wire'],
          systemsInstalled: 2,
          stormPhase: 2,
          npcQuests: { harvey: true, maria: false, dale: false, reeves: false },
          visitedZones: [0, 1, 2],
          achievements: ['first_loot', 'first_craft'],
        },
      });
      localStorage.setItem('swampfire_save', save);
    });

    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });

    // Click CONTINUE (navigate through splash to trigger load)
    // Implementation-dependent: may be SPACE or click
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    await waitForGameReady(page);

    const timeLeft = await page.evaluate(() => {
      return window.game.registry.get('timeLeft');
    });
    expect(timeLeft).toBe(2100);
  });

  test.skip('CONTINUE restores player HP correctly', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const save = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: {
          position: { x: 1920, y: 2496 },
          zone: 0,
          hp: 1,
          xp: 200,
          timeLeft: 1500,
          timerExpired: false,
          inventory: [],
          systemsInstalled: 0,
          stormPhase: 2,
          npcQuests: { harvey: false, maria: false, dale: false, reeves: false },
          visitedZones: [0],
          achievements: [],
        },
      });
      localStorage.setItem('swampfire_save', save);
    });

    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    await waitForGameReady(page);

    const hp = await page.evaluate(() => window.game.registry.get('hp'));
    expect(hp).toBe(1);
  });

  test.skip('CONTINUE restores inventory contents', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const save = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: {
          position: { x: 1920, y: 2496 },
          zone: 0,
          hp: 3,
          xp: 100,
          timeLeft: 3000,
          timerExpired: false,
          inventory: ['branch', 'copper_wire', 'capacitor'],
          systemsInstalled: 1,
          stormPhase: 1,
          npcQuests: { harvey: false, maria: false, dale: false, reeves: false },
          visitedZones: [0, 1],
          achievements: ['first_loot'],
        },
      });
      localStorage.setItem('swampfire_save', save);
    });

    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    await waitForGameReady(page);

    const inventory = await page.evaluate(() => window.game.registry.get('inventory'));
    expect(inventory).toEqual(['branch', 'copper_wire', 'capacitor']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 5 — Weather system recalculates on load
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — weather recalculation on load', () => {
  test.skip('loading a save with timeLeft=1500 activates storm phase 2 visual effects', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const save = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: {
          position: { x: 1920, y: 2496 },
          zone: 0,
          hp: 3,
          xp: 0,
          timeLeft: 1500,
          timerExpired: false,
          inventory: [],
          systemsInstalled: 0,
          stormPhase: 3,
          npcQuests: { harvey: false, maria: false, dale: false, reeves: false },
          visitedZones: [0],
          achievements: [],
        },
      });
      localStorage.setItem('swampfire_save', save);
    });

    await page.reload();
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    await waitForGameReady(page);

    // Storm phase should be recalculated from timeLeft=1500 → phase 3
    const stormPhase = await page.evaluate(() => window.game.registry.get('stormPhase'));
    expect(stormPhase).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 6 — Performance
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Save System — performance', () => {
  test.skip('save/load cycle completes under 50ms in the browser', async ({ page }) => {
    await skipToGameplay(page);

    const elapsed = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Force a save and time it
      const start = performance.now();
      // Trigger save (implementation-dependent method name)
      if (game.saveSystem) {
        game.saveSystem.save();
        const raw = localStorage.getItem('swampfire_save');
        JSON.parse(raw); // simulate load
      }
      return performance.now() - start;
    });

    expect(elapsed).toBeLessThan(50);
  });
});
