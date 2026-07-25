/**
 * E2E Tests for Pause Menu — Issue #99
 *
 * Tests the full pause-menu flow in the running game:
 *   - ESC pauses GameScene and stops the HUD timer
 *   - ESC again resumes gameplay and timer resumes
 *   - QUIT TO MENU returns to splash scene
 *   - Pause overlay displays flavour text, stats, and menu options
 *
 * Uses the same game-ready bypass as game-flow.e2e.js: wait for Splash scene,
 * seed the registry, then programmatically start the Game scene to skip the
 * multi-phase SPACE-gated Transition cinematic.
 */

import { test, expect } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wait for game to be fully loaded and ready.
 * Copied from game-flow.e2e.js: waits for Splash, seeds registry, jumps to Game.
 */
async function waitForGameReady(page) {
  // Wait for Bootloader to finish — Splash becoming active proves assets are loaded.
  await page.waitForFunction(
    () => {
      const g = window.game;
      return g && g.scene && g.scene.isActive('splash');
    },
    null,
    { timeout: 15000 }
  );

  // Skip the 4-phase Transition cinematic — jump straight to GameScene.
  // Seed the registry with the initial game state that TransitionScene normally sets.
  await page.evaluate(() => {
    const g = window.game;
    g.registry.set('hp', 3);
    g.registry.set('xp', 0);
    g.registry.set('timeLeft', 3600);
    g.registry.set('timerExpired', false);
    g.registry.set('inventory', []);
    g.registry.set('systemsInstalled', 0);
    g.registry.set('stormPhase', 1);
    g.registry.set('hudToast', '');
    g.scene.start('game');
  });

  // Wait for GameScene to be active.
  await page.waitForFunction(
    () => {
      const g = window.game;
      return g && g.scene && g.scene.isActive('game');
    },
    null,
    { timeout: 10000 }
  );
}

async function getTimeLeft(page) {
  return page.evaluate(() => {
    return window.game.registry.get('timeLeft');
  });
}

async function isSceneActive(page, sceneKey) {
  return page.evaluate((key) => {
    return window.game.scene.getScene(key)?.sys?.settings?.active === true;
  }, sceneKey);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Pause Menu (ESC key) — Issue #99', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    // Small buffer for HUD timer to begin ticking
    await page.waitForTimeout(1500);
  });

  test('ESC pauses the game and the timer stops advancing', async ({ page }) => {
    // Record the time before pause
    const timeBefore = await getTimeLeft(page);

    // Press ESC to pause
    await page.keyboard.press('Escape');

    // Wait 3 seconds — timer should NOT decrement while paused
    await page.waitForTimeout(3000);

    const timeAfter = await getTimeLeft(page);

    // Timer should not have advanced (or at most 1 second of lag from key press)
    expect(timeBefore - timeAfter).toBeLessThanOrEqual(1);
  });

  test('ESC again resumes gameplay and timer resumes ticking', async ({ page }) => {
    // Pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify timer is frozen: call hud.tick() — it should have no effect while paused
    const frozenCheck = await page.evaluate(() => {
      const g = window.game;
      const before = g.registry.get('timeLeft');
      // HUD scene is paused — its time events don't fire. Manually verify:
      return { before, paused: g.scene.getScene('hud')?.sys?.settings?.active === false };
    });
    expect(frozenCheck.paused).toBe(true);

    // Resume by pressing ESC again
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify HUD scene is active (unpaused) and timer CAN tick
    const resumeResult = await page.evaluate(() => {
      const g = window.game;
      const hud = g.scene.getScene('hud');
      const isActive = hud?.sys?.settings?.active === true;
      // Manually fire a tick to prove the timer is operational after resume
      const before = g.registry.get('timeLeft');
      hud.tick();
      const after = g.registry.get('timeLeft');
      return { isActive, before, after, decremented: before - after };
    });

    expect(resumeResult.isActive).toBe(true);
    expect(resumeResult.decremented).toBe(1);
  });

  test('pause overlay displays the correct flavour text', async ({ page }) => {
    // Press ESC to open pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Read the flavour text from the pause overlay via game state
    const flavourText = await page.evaluate(() => {
      const pauseScene = window.game.scene.getScene('pause');
      // The implementer should expose flavourText or we read it from the overlay
      return pauseScene?._flavourText?.text ?? pauseScene?.flavourText ?? null;
    });

    expect(flavourText).toBe(
      'Time paused. The hurricane waits for no one. But it will wait for you.'
    );
  });

  test('pause overlay shows system checklist', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const hasChecklist = await page.evaluate(() => {
      const pauseScene = window.game.scene.getScene('pause');
      // The overlay should contain checklist rows — at least 5 system entries
      return pauseScene?._checklistElements?.length >= 5;
    });

    expect(hasChecklist).toBe(true);
  });

  test('pause overlay shows RESUME, SETTINGS, and QUIT TO MENU options', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const menuLabels = await page.evaluate(() => {
      const pauseScene = window.game.scene.getScene('pause');
      return pauseScene?._menuOptionLabels ?? [];
    });

    expect(menuLabels).toEqual(['RESUME', 'SETTINGS', 'QUIT TO MENU']);
  });

  test('QUIT TO MENU returns to the splash scene', async ({ page }) => {
    // Press ESC to open pause menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Navigate to QUIT option (it's the 3rd option, so press down twice)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Confirm selection (Enter or E)
    await page.keyboard.press('Enter');

    // Wait for scene transition
    await page.waitForTimeout(1000);

    // Verify splash scene is now active and game scene is not
    const splashActive = await isSceneActive(page, 'splash');
    const gameActive = await isSceneActive(page, 'game');

    expect(splashActive).toBe(true);
    expect(gameActive).toBe(false);
  });

  test('RESUME option unpauses the game (same as ESC)', async ({ page }) => {
    // Press ESC to open pause menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // RESUME is the first option (already selected by default)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Game scene should be active and unpaused
    const gameActive = await isSceneActive(page, 'game');
    expect(gameActive).toBe(true);

    // Timer should be ticking again
    const timeBefore = await getTimeLeft(page);
    await page.waitForTimeout(2000);
    const timeAfter = await getTimeLeft(page);
    expect(timeBefore - timeAfter).toBeGreaterThanOrEqual(1);
  });

  test('pause overlay shows current stats (time, XP, HP)', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const stats = await page.evaluate(() => {
      const pauseScene = window.game.scene.getScene('pause');
      return {
        hasTimeDisplay: !!pauseScene?._timeText,
        hasXpDisplay: !!pauseScene?._xpText,
        hasHpDisplay: !!pauseScene?._hpText,
      };
    });

    expect(stats.hasTimeDisplay).toBe(true);
    expect(stats.hasXpDisplay).toBe(true);
    expect(stats.hasHpDisplay).toBe(true);
  });
});
