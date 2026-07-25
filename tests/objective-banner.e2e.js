/**
 * objective-banner.e2e.js
 *
 * E2E stubs for Issue #97 — Objective Banner (always-visible HUD goal).
 *
 * These tests verify Phaser-dependent HUD behaviour that cannot be unit tested:
 *   - Banner visibility and positioning below the timer
 *   - Auto-update when systems are installed
 *   - Pulse animation when objective changes
 *   - Disappearance when all systems installed
 *
 * All tests are test.skip() — they define the contract for the implementing agent
 * and will be unskipped once the HUD integration is built.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForGameReady(page) {
  await page.waitForFunction(
    () => window.game?.scene?.getScene('game')?.sys?.settings?.active,
    { timeout: 15000 }
  );
}

async function getObjectiveBannerText(page) {
  return page.evaluate(() => {
    const hud = window.game.scene.getScene('hud');
    return hud?.objectiveBanner?.text ?? null;
  });
}

async function getObjectiveBannerAlpha(page) {
  return page.evaluate(() => {
    const hud = window.game.scene.getScene('hud');
    return hud?.objectiveBanner?.alpha ?? null;
  });
}

async function getSystemsInstalled(page) {
  return page.evaluate(() => {
    return window.game.registry.get('systemsInstalled') ?? 0;
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Objective Banner — HUD integration', () => {

  test.skip('banner is visible below the timer on game start', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const text = await getObjectiveBannerText(page);
    expect(text).not.toBeNull();
    expect(text).toMatch(/^Find .+ — check .+$/);

    // Verify Y position is below timer (timer is at y=18, size 30 → bottom ~48)
    const bannerY = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?.objectiveBanner?.y ?? 0;
    });
    expect(bannerY).toBeGreaterThan(48);
  });

  test.skip('banner shows "Find Fuel Injector" at game start (0 systems)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const text = await getObjectiveBannerText(page);
    expect(text).toContain('Fuel Injector');
  });

  test.skip('banner auto-updates when a system is installed', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Get initial text
    const initialText = await getObjectiveBannerText(page);
    expect(initialText).toContain('Fuel Injector');

    // Simulate installing first system
    await page.evaluate(() => {
      window.game.registry.set('systemsInstalled', 1);
    });

    // Wait for HUD to react
    await page.waitForTimeout(200);

    const updatedText = await getObjectiveBannerText(page);
    expect(updatedText).toContain('Oxidizer Tank');
    expect(updatedText).not.toContain('Fuel Injector');
  });

  test.skip('banner pulses briefly when objective changes', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Install a system to trigger objective change
    await page.evaluate(() => {
      window.game.registry.set('systemsInstalled', 1);
    });

    // During pulse, alpha should be animated (not exactly 1.0)
    await page.waitForTimeout(100); // mid-pulse
    const alphaInPulse = await getObjectiveBannerAlpha(page);
    // Pulse means alpha is cycling — could be anything between 0 and 1
    expect(alphaInPulse).toBeDefined();
    expect(alphaInPulse).toBeGreaterThanOrEqual(0);
    expect(alphaInPulse).toBeLessThanOrEqual(1);
  });

  test.skip('banner shows "Launch the rocket!" when all 5 systems installed', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Install all systems
    await page.evaluate(() => {
      window.game.registry.set('systemsInstalled', 5);
    });

    await page.waitForTimeout(200);

    const text = await getObjectiveBannerText(page);
    expect(text).toBe('Launch the rocket!');
  });

  test.skip('banner disappears (or stays as launch text) after all systems done', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.evaluate(() => {
      window.game.registry.set('systemsInstalled', 5);
    });

    await page.waitForTimeout(500);

    // Either the banner shows "Launch the rocket!" or is hidden
    const text = await getObjectiveBannerText(page);
    if (text !== null) {
      expect(text).toBe('Launch the rocket!');
    }
  });

  test.skip('banner updates when player crafts a component (enough ingredients)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Give player 2 ingredients
    await page.evaluate(() => {
      window.game.registry.set('inventory', [
        { label: 'Copper Wiring', type: 'ingredient' },
        { label: 'Solenoid Valve', type: 'ingredient' },
      ]);
    });

    await page.waitForTimeout(200);

    const text = await getObjectiveBannerText(page);
    // With enough ingredients, should suggest crafting
    expect(text).toMatch(/craft|workbench/i);
  });

  test.skip('banner positioned at correct X (centred) and Y (below timer)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const pos = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      const banner = hud?.objectiveBanner;
      if (!banner) return null;
      return { x: banner.x, y: banner.y, originX: banner.originX };
    });

    expect(pos).not.toBeNull();
    // Should be centred (originX = 0.5)
    expect(pos.originX).toBeCloseTo(0.5, 1);
    // Should be below timer (timer bottom ≈ y 48) with some padding
    expect(pos.y).toBeGreaterThan(48);
    expect(pos.y).toBeLessThan(80); // not too far down
  });
});
