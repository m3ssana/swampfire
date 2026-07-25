/**
 * Near-Miss Feedback E2E Tests — Issue #93
 *
 * Playwright E2E stubs for the near-miss feedback system.
 * These test the Phaser-dependent integration: real camera effects, SFX,
 * slow-motion, XP popups, and combo chain feeding.
 *
 * All tests are test.skip() until the implementation is complete and
 * the Phaser scene is wired up to fire the near-miss pipeline.
 */

import { test, expect } from '@playwright/test';

/**
 * Helper: Wait for game scene to be active and ready.
 * Skips Bootloader → Splash → Transition and jumps straight to GameScene.
 */
async function waitForGameReady(page) {
  await page.waitForFunction(
    () => {
      const g = window.game;
      return g && g.scene && g.scene.isActive('splash');
    },
    null,
    { timeout: 15000 }
  );

  await page.evaluate(() => {
    const g = window.game;
    g.registry.set('hp', 3);
    g.registry.set('xp', 0);
    g.registry.set('timeLeft', 3600);
    g.registry.set('stormPhase', 1);
    g.registry.set('inventory', []);
    g.registry.set('visitedZones', [0]);
    g.scene.stop('splash');
    g.scene.start('game', { name: 'Juan', number: 1 });
  });

  await page.waitForFunction(
    () => window.game?.scene?.getScene('game')?.sys?.settings?.active,
    null,
    { timeout: 10000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Near-miss feedback system (#93)', () => {

  test.skip('triggers 200ms slow-motion at 0.5x timescale on near-miss', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Walk into a rattlesnake_warn sensor zone
    // Verify that game.time.timeScale is set to 0.5
    const timescale = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      // Simulate near-miss trigger
      scene.handleNearMiss?.('rattlesnake_warn');
      return window.game.loop.timeScale;
    });
    expect(timescale).toBe(0.5);

    // Verify it reverts to 1.0 after ~200ms
    await page.waitForTimeout(300);
    const restored = await page.evaluate(() => window.game.loop.timeScale);
    expect(restored).toBe(1.0);
  });

  test.skip('shows green screen-edge pulse on near-miss', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Trigger near-miss and check camera flash was invoked with green tint
    const flashFired = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      let called = false;
      const orig = scene.cameras.main.flash.bind(scene.cameras.main);
      scene.cameras.main.flash = (...args) => { called = true; orig(...args); };
      scene.handleNearMiss?.('rattlesnake_warn');
      return called;
    });
    expect(flashFired).toBe(true);
  });

  test.skip('awards +15 XP on near-miss with green popup', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const xpBefore = await page.evaluate(() => window.game.registry.get('xp') ?? 0);

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      scene.handleNearMiss?.('looter_warn');
    });

    const xpAfter = await page.evaluate(() => window.game.registry.get('xp'));
    expect(xpAfter - xpBefore).toBe(15);
  });

  test.skip('plays whoosh + heartbeat SFX on near-miss', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const sfxPlayed = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const played = [];
      const origPlay = scene.sound.play.bind(scene.sound);
      scene.sound.play = (key, ...args) => { played.push(key); origPlay(key, ...args); };
      scene.handleNearMiss?.('powerline_warn');
      return played;
    });
    expect(sfxPlayed).toContain('nearmiss_whoosh');
    expect(sfxPlayed).toContain('nearmiss_heartbeat');
  });

  test.skip('near-miss feeds into combo system — increments combo count', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const comboBefore = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      return scene.comboTracker?._count ?? 0;
    });

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      scene.handleNearMiss?.('rattlesnake_warn');
    });

    const comboAfter = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      return scene.comboTracker?._count ?? 0;
    });
    expect(comboAfter).toBe(comboBefore + 1);
  });

  test.skip('works for rattlesnake hazard type', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const xpBefore = window.game.registry.get('xp') ?? 0;
      scene.handleNearMiss?.('rattlesnake_warn');
      const xpAfter = window.game.registry.get('xp') ?? 0;
      return { gained: xpAfter - xpBefore };
    });
    expect(result.gained).toBe(15);
  });

  test.skip('works for power line hazard type', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const xpBefore = window.game.registry.get('xp') ?? 0;
      scene.handleNearMiss?.('powerline_warn');
      const xpAfter = window.game.registry.get('xp') ?? 0;
      return { gained: xpAfter - xpBefore };
    });
    expect(result.gained).toBe(15);
  });

  test.skip('works for looter hazard type', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const xpBefore = window.game.registry.get('xp') ?? 0;
      scene.handleNearMiss?.('looter_warn');
      const xpAfter = window.game.registry.get('xp') ?? 0;
      return { gained: xpAfter - xpBefore };
    });
    expect(result.gained).toBe(15);
  });

  test.skip('debounce prevents rapid re-triggering from same hazard', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const xpGained = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const xpBefore = window.game.registry.get('xp') ?? 0;
      // Trigger 3 times rapidly — should only award once
      scene.handleNearMiss?.('rattlesnake_warn');
      scene.handleNearMiss?.('rattlesnake_warn');
      scene.handleNearMiss?.('rattlesnake_warn');
      const xpAfter = window.game.registry.get('xp') ?? 0;
      return xpAfter - xpBefore;
    });
    expect(xpGained).toBe(15); // only one award despite 3 calls
  });

});
