/**
 * E2E tests — System Checklist overlay (TAB key) — Issue #94
 *
 * These stubs test the Phaser-rendered overlay behavior that cannot be
 * verified in Vitest/jsdom. They will be un-skipped once the overlay
 * scene is implemented.
 */

import { test, expect } from '@playwright/test';

// ─── Helper: wait for the game to be fully loaded and active ──────────────────
async function waitForGameReady(page) {
  await page.waitForFunction(
    () => window.game?.scene?.getScene('game')?.sys?.settings?.active,
    { timeout: 15000 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// System Checklist Overlay — TAB key
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('System Checklist overlay (TAB)', () => {

  test.skip('TAB opens overlay without pausing the game (timer keeps ticking)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Read timeLeft before TAB
    const timeBefore = await page.evaluate(() =>
      window.game.registry.get('timeLeft')
    );

    // Press TAB to open checklist
    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);

    // Timer should have ticked (game NOT paused)
    const timeAfter = await page.evaluate(() =>
      window.game.registry.get('timeLeft')
    );
    expect(timeAfter).toBeLessThan(timeBefore);
  });

  test.skip('TAB shows all 5 systems in the overlay', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Verify overlay scene is active and shows 5 system rows
    const systemCount = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      return scene?.systemRows?.length ?? 0;
    });
    expect(systemCount).toBe(5);
  });

  test.skip('overlay shows correct status indicators for each system', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Install 1 system, put 1 component in inventory
    await page.evaluate(() => {
      const game = window.game;
      game.registry.set('systemsInstalled', 1);
      game.registry.set('inventory', [
        { label: 'Oxidizer Tank', type: 'component' }
      ]);
    });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const statuses = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      return scene?.getSystemStatuses?.() ?? [];
    });

    // First system installed (green [X])
    expect(statuses[0]).toBe('installed');
    // Second system in inventory (yellow [/])
    expect(statuses[1]).toBe('in_inventory');
    // Remaining systems needed (gray [ ])
    expect(statuses[2]).toBe('needed');
    expect(statuses[3]).toBe('needed');
    expect(statuses[4]).toBe('needed');
  });

  test.skip('overlay shows zone hints for missing ingredients', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Check that zone hints are rendered for missing items
    const hasZoneHints = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      // At least one ingredient row should have zone text
      return scene?.hasZoneHints?.() ?? false;
    });
    expect(hasZoneHints).toBe(true);
  });

  test.skip('overlay shows overall progress string "X/5 systems (XX%)"', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.evaluate(() => {
      window.game.registry.set('systemsInstalled', 2);
    });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const progressText = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      return scene?.progressText?.text ?? '';
    });
    expect(progressText).toContain('2/5 systems (40%)');
  });

  test.skip('overlay shows time remaining', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.evaluate(() => {
      window.game.registry.set('timeLeft', 1800); // 30:00
    });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const hasTimeDisplay = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      return scene?.timeRemainingText?.text?.includes('30:00') ?? false;
    });
    expect(hasTimeDisplay).toBe(true);
  });

  test.skip('TAB again closes the overlay', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Open
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Verify open
    const isOpenBefore = await page.evaluate(() =>
      window.game.scene.isActive('checklist')
    );
    expect(isOpenBefore).toBe(true);

    // Close
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Verify closed
    const isOpenAfter = await page.evaluate(() =>
      window.game.scene.isActive('checklist')
    );
    expect(isOpenAfter).toBe(false);
  });

  test.skip('overlay is semi-transparent (game world visible behind)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // The overlay background should have alpha < 1
    const bgAlpha = await page.evaluate(() => {
      const scene = window.game.scene.getScene('checklist');
      return scene?.background?.alpha ?? 1;
    });
    expect(bgAlpha).toBeLessThan(1);
    expect(bgAlpha).toBeGreaterThan(0);
  });
});
