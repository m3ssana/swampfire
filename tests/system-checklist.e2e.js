/**
 * E2E tests — System Checklist overlay (TAB key) — Issue #94
 *
 * These stubs test the Phaser-rendered overlay behavior that cannot be
 * verified in Vitest/jsdom. They target the HUD scene where the overlay
 * actually lives (this._checklistOpen, this._checklistElements).
 *
 * They will be un-skipped once full E2E infrastructure is wired into CI.
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
// System Checklist Overlay — TAB key (lives on HUD scene)
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

  test.skip('TAB opens the checklist on the HUD scene (_checklistOpen = true)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Verify overlay state on the HUD scene
    const isOpen = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?._checklistOpen ?? false;
    });
    expect(isOpen).toBe(true);
  });

  test.skip('TAB renders 5 system rows (elements populated in _checklistElements)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // _checklistElements should have multiple elements:
    // bg + border + header + time + 5*(sysText + 2 ingTexts) + footer
    // = 2 + 2 + 5*3 + 1 = 20 minimum (exact count depends on rendering)
    const elementCount = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?._checklistElements?.length ?? 0;
    });
    // At minimum: bg(1) + border(1) + header(1) + time(1) + 5 sys texts + 10 ing texts + footer(1) = 20
    expect(elementCount).toBeGreaterThanOrEqual(20);
  });

  test.skip('overlay shows correct status for mixed game state', async ({ page }) => {
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

    // Re-read state through buildChecklist logic via the rendered elements
    const isOpen = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?._checklistOpen ?? false;
    });
    expect(isOpen).toBe(true);

    // The header should contain "1/5 systems (20%)"
    const headerText = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      // First text element after bg and border is the header (index 2)
      const header = hud?._checklistElements?.[2];
      return header?.text ?? '';
    });
    expect(headerText).toContain('1/5 systems (20%)');
  });

  test.skip('overlay shows zone hints for missing ingredients', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Look for zone names in the rendered text elements
    const hasZoneHints = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      const elements = hud?._checklistElements ?? [];
      // Zone hints appear as "(ZoneName, ...)" in ingredient text elements
      return elements.some(el => el?.text?.includes('Cypress Creek') || el?.text?.includes('US-41'));
    });
    expect(hasZoneHints).toBe(true);
  });

  test.skip('overlay shows time remaining', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.evaluate(() => {
      window.game.registry.set('timeLeft', 1800); // 30:00
    });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Time text element is at index 3 in _checklistElements
    const timeText = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      const elements = hud?._checklistElements ?? [];
      return elements.find(el => el?.text?.includes('TIME:'))?.text ?? '';
    });
    expect(timeText).toContain('30:00');
  });

  test.skip('TAB again closes the overlay (_checklistOpen = false, elements destroyed)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Open
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const isOpenBefore = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?._checklistOpen ?? false;
    });
    expect(isOpenBefore).toBe(true);

    // Close
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return {
        open: hud?._checklistOpen ?? true,
        elementCount: hud?._checklistElements?.length ?? -1,
      };
    });
    expect(state.open).toBe(false);
    expect(state.elementCount).toBe(0);
  });

  test.skip('overlay backdrop is semi-transparent (game world visible behind)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Background element is at index 0 in _checklistElements
    const bgAlpha = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      const bg = hud?._checklistElements?.[0];
      return bg?.alpha ?? 1;
    });
    expect(bgAlpha).toBeLessThan(1);
    expect(bgAlpha).toBeGreaterThan(0);
  });
});
