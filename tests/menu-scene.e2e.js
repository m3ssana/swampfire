/**
 * Menu Scene E2E Tests (Issue #115)
 *
 * Playwright stubs for end-to-end verification of the new menu system.
 * These test the actual game running in the browser with real Phaser scenes.
 *
 * All tests are test.skip() — they define acceptance criteria that will be
 * unskipped once menu_logic.js and the MenuScene are implemented.
 *
 * CONTINUE availability depends on issue #98's save system (already merged).
 * Leaderboard persistence depends on issue #106 (NOT yet implemented) —
 * the leaderboard screen should show placeholder dashes when no bests exist.
 */

import { test, expect } from '@playwright/test';

// ── Helper: wait for splash/menu scene to be active ───────────────────────────

async function waitForMenuReady(page) {
  await page.waitForFunction(
    () => window.game?.scene?.getScene('splash')?.sys?.settings?.active,
    { timeout: 15000 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group 1 — Menu rendering
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — rendering', () => {
  test.skip('displays title in amber colour (not green)', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    // Access title text tint from the scene
    const titleTint = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      // The title text should use TITLE_COLOUR (0xFFBF00) for amber
      const titleTexts = splash.children.list.filter(
        c => c.type === 'BitmapText' && c.text === 'SWAMPFIRE'
      );
      // Top-layer (highlight) text tint — should be amber
      const highlight = titleTexts[titleTexts.length - 1];
      return highlight?.tintTopLeft;
    });

    expect(titleTint).toBe(0xFFBF00);
  });

  test.skip('displays all 4 menu options', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    const optionLabels = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      // Menu options rendered as BitmapText children
      const menuTexts = splash.children.list
        .filter(c => c.type === 'BitmapText')
        .map(c => c.text);
      return menuTexts;
    });

    expect(optionLabels).toContain('NEW GAME');
    expect(optionLabels).toContain('CONTINUE');
    expect(optionLabels).toContain('LEADERBOARD');
    expect(optionLabels).toContain('SETTINGS');
  });

  test.skip('animated background has rain particles active', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    const hasRainEmitter = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      // Check for particle emitter (rain effect)
      return splash.children.list.some(c => c.type === 'ParticleEmitter');
    });

    expect(hasRainEmitter).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 2 — CONTINUE state (depends on save system from issue #98)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — CONTINUE availability', () => {
  test.skip('CONTINUE is greyed out when no save exists', async ({ page }) => {
    // Clear any existing save first
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('swampfire_save'));
    await page.reload();
    await waitForMenuReady(page);

    const continueAlpha = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      const continueText = splash.children.list.find(
        c => c.type === 'BitmapText' && c.text === 'CONTINUE'
      );
      return continueText?.alpha;
    });

    // Greyed out = reduced alpha
    expect(continueAlpha).toBeLessThan(1);
  });

  test.skip('CONTINUE is fully visible when a valid save exists', async ({ page }) => {
    await page.goto('/');

    // Inject a valid save into localStorage
    await page.evaluate(() => {
      const state = {
        position: { x: 100, y: 200 },
        zone: 0, hp: 3, xp: 500, timeLeft: 2400,
        timerExpired: false, inventory: [], systemsInstalled: 1,
        stormPhase: 2, npcQuests: { harvey: false, maria: false, dale: false, reeves: false },
        visitedZones: [0, 1],
        achievements: [],
      };
      const envelope = { version: 1, timestamp: Date.now(), state };
      localStorage.setItem('swampfire_save', JSON.stringify(envelope));
    });

    await page.reload();
    await waitForMenuReady(page);

    const continueAlpha = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      const continueText = splash.children.list.find(
        c => c.type === 'BitmapText' && c.text === 'CONTINUE'
      );
      return continueText?.alpha;
    });

    expect(continueAlpha).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 3 — Keyboard navigation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — keyboard navigation', () => {
  test.skip('pressing DOWN moves selection from NEW GAME to next option', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const selected = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      return splash.currentSelection;  // expected: exposed property
    });

    // With no save: skips CONTINUE, lands on LEADERBOARD
    // With save: lands on CONTINUE
    expect(['continue', 'leaderboard']).toContain(selected);
  });

  test.skip('pressing UP from NEW GAME wraps to SETTINGS', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);

    const selected = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      return splash.currentSelection;
    });

    expect(selected).toBe('settings');
  });

  test.skip('navigation skips disabled CONTINUE when no save', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('swampfire_save'));
    await page.reload();
    await waitForMenuReady(page);

    // Down from NEW GAME should skip CONTINUE
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const selected = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      return splash.currentSelection;
    });

    expect(selected).toBe('leaderboard');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 4 — Menu actions
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — actions', () => {
  test.skip('selecting NEW GAME and pressing ENTER starts transition scene', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    // NEW GAME is already selected by default
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const activeScene = await page.evaluate(() => {
      return window.game.scene.getScene('transition')?.sys?.settings?.active;
    });

    expect(activeScene).toBe(true);
  });

  test.skip('selecting CONTINUE loads saved state and starts game', async ({ page }) => {
    await page.goto('/');

    // Inject a save
    await page.evaluate(() => {
      const state = {
        position: { x: 300, y: 400 },
        zone: 1, hp: 2, xp: 1000, timeLeft: 1800,
        timerExpired: false, inventory: ['fuel_cell'], systemsInstalled: 2,
        stormPhase: 2, npcQuests: { harvey: true, maria: false, dale: false, reeves: false },
        visitedZones: [0, 1, 2],
        achievements: ['first_loot'],
      };
      const envelope = { version: 1, timestamp: Date.now(), state };
      localStorage.setItem('swampfire_save', JSON.stringify(envelope));
    });

    await page.reload();
    await waitForMenuReady(page);

    // Navigate to CONTINUE and press ENTER
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Game scene should be active with restored state
    const gameActive = await page.evaluate(() => {
      return window.game.scene.getScene('game')?.sys?.settings?.active;
    });
    expect(gameActive).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 5 — Leaderboard sub-screen
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — leaderboard', () => {
  test.skip('shows placeholder dashes when no personal bests exist', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('swampfire_leaderboard'));
    await page.reload();
    await waitForMenuReady(page);

    // Navigate to LEADERBOARD and select it
    await page.keyboard.press('ArrowDown');  // or multiple presses
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const hasPlaceholders = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      const texts = splash.children.list
        .filter(c => c.type === 'BitmapText')
        .map(c => c.text);
      return texts.some(t => t.includes('--'));
    });

    expect(hasPlaceholders).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 6 — Settings sub-screen
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — settings', () => {
  test.skip('settings screen shows volume controls', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    // Navigate to SETTINGS
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const hasVolumeText = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      const texts = splash.children.list
        .filter(c => c.type === 'BitmapText')
        .map(c => c.text);
      return texts.some(t => t.toUpperCase().includes('VOLUME'));
    });

    expect(hasVolumeText).toBe(true);
  });

  test.skip('settings screen shows control hints', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const hasControls = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      const texts = splash.children.list
        .filter(c => c.type === 'BitmapText')
        .map(c => c.text);
      return texts.some(t => t.includes('WASD') || t.includes('Move'));
    });

    expect(hasControls).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 7 — Animated background
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Menu Scene — animated background', () => {
  test.skip('distant lightning flashes occur in the background', async ({ page }) => {
    await page.goto('/');
    await waitForMenuReady(page);

    // Wait long enough for at least one lightning flash to fire
    // Lightning logic from issue #114 — reused in menu background
    await page.waitForTimeout(5000);

    const hadFlash = await page.evaluate(() => {
      const splash = window.game.scene.getScene('splash');
      // Track if any flash/white-overlay was triggered
      return splash._lightningFired === true;
    });

    expect(hadFlash).toBe(true);
  });
});
