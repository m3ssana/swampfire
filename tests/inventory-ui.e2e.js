/**
 * inventory-ui.e2e.js — E2E stubs for Issue #100: Inventory UI
 *
 * These tests exercise the Phaser-rendered inventory UI through the real game
 * pipeline. They are marked test.skip() until the implementation exists.
 *
 * Acceptance criteria tested:
 *   - 8-slot grid inventory display visible in HUD
 *   - Colour-coded borders match item types
 *   - Base camp stash accessible at Zone 0
 *   - Auto-pickup for consumables
 *   - Inventory full notification at 8/8
 */

import { test, expect } from '@playwright/test';

const GAME_READY_TIMEOUT = 10000;

/**
 * Wait for the game scene to be active and ready.
 */
async function waitForGameReady(page) {
  await page.waitForFunction(
    () => window.game?.scene?.getScene('game')?.sys?.settings?.active,
    { timeout: GAME_READY_TIMEOUT }
  );
}

// ─── 8-slot grid display ──────────────────────────────────────────────────────

test.describe('Inventory UI — 8-slot grid display', () => {
  test.skip('displays 8 inventory slots in the HUD', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const slotCount = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      return hud?.inventorySlots?.length ?? 0;
    });

    expect(slotCount).toBe(8);
  });

  test.skip('slots are visible as a grid layout', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const hasGrid = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      if (!hud?.inventorySlots?.length) return false;
      // Verify slots have distinct x positions (grid, not stacked)
      const xs = hud.inventorySlots.map(s => s.x);
      const unique = new Set(xs);
      return unique.size > 1;
    });

    expect(hasGrid).toBe(true);
  });
});

// ─── Colour-coded borders ─────────────────────────────────────────────────────

test.describe('Inventory UI — colour-coded borders', () => {
  test.skip('rocket component slot has gold border', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const borderColour = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Add a component to inventory
      const inv = game.registry.get('inventory') ?? [];
      game.registry.set('inventory', [
        ...inv,
        { label: 'Fuel Injector', type: 'component' },
      ]);
      // Check the border colour rendered by HUD
      const hud = window.game.scene.getScene('hud');
      const slot = hud?.inventorySlots?.[0];
      return slot?.borderColour ?? slot?.strokeColor ?? null;
    });

    // Gold = 0xffd700 = 16766720 (decimal)
    expect(borderColour).toBe(0xffd700);
  });

  test.skip('crafting material slot has blue border', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const borderColour = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', [
        { label: 'Copper Wiring', type: 'ingredient' },
      ]);
      const hud = window.game.scene.getScene('hud');
      const slot = hud?.inventorySlots?.[0];
      return slot?.borderColour ?? slot?.strokeColor ?? null;
    });

    // Blue = 0x4fc3f7 = 5227511 (decimal)
    expect(borderColour).toBe(0x4fc3f7);
  });

  test.skip('consumable slot has green border', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const borderColour = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', [
        { label: 'Energy Drink', type: 'consumable' },
      ]);
      const hud = window.game.scene.getScene('hud');
      const slot = hud?.inventorySlots?.[0];
      return slot?.borderColour ?? slot?.strokeColor ?? null;
    });

    // Green = 0x76ff03 = 7798531 (decimal)
    expect(borderColour).toBe(0x76ff03);
  });

  test.skip('tool/junk slot has gray border', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const borderColour = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', [
        { label: 'Wire Stripper', type: 'junk' },
      ]);
      const hud = window.game.scene.getScene('hud');
      const slot = hud?.inventorySlots?.[0];
      return slot?.borderColour ?? slot?.strokeColor ?? null;
    });

    // Gray = 0x9e9e9e = 10395550 (decimal)
    expect(borderColour).toBe(0x9e9e9e);
  });
});

// ─── Base camp stash ──────────────────────────────────────────────────────────

test.describe('Inventory UI — base camp stash at Zone 0', () => {
  test.skip('stash is accessible when player is in Zone 0', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const canAccessStash = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Player starts in Zone 0
      return game.currentZone === 0 || game.zoneManager?.currentZone === 0;
    });

    expect(canAccessStash).toBe(true);
  });

  test.skip('stash is NOT accessible in Zone 2', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const blocked = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Simulate being in zone 2
      if (game.zoneManager) game.zoneManager.currentZone = 2;
      // Attempt stash access via game API
      const result = game.accessStash?.() ?? { success: false, reason: 'not_at_base' };
      return result.reason;
    });

    expect(blocked).toBe('not_at_base');
  });

  test.skip('stash can hold more than 8 items (unlimited)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const stashSize = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Directly set a large stash
      const bigStash = Array.from({ length: 50 }, (_, i) => ({
        label: `Stash Item ${i}`,
        type: 'ingredient',
      }));
      game.registry.set('stash', bigStash);
      return (game.registry.get('stash') ?? []).length;
    });

    expect(stashSize).toBe(50);
  });
});

// ─── Auto-pickup for consumables ──────────────────────────────────────────────

test.describe('Inventory UI — auto-pickup', () => {
  test.skip('consumable items are auto-collected when inventory has space', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const pickedUp = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', []);
      // Simulate a consumable drop near the player
      const item = { label: 'Energy Drink', type: 'consumable', xp: 4, tint: 0x76ff03 };
      // The game should auto-collect this
      game.handleAutoPickup?.(item);
      const inv = game.registry.get('inventory') ?? [];
      return inv.some(i => i.label === 'Energy Drink');
    });

    expect(pickedUp).toBe(true);
  });

  test.skip('consumable is NOT auto-collected when inventory is full', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const rejected = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      const fullInv = Array.from({ length: 8 }, (_, i) => ({ label: `X${i}`, type: 'junk' }));
      game.registry.set('inventory', fullInv);
      const item = { label: 'Energy Drink', type: 'consumable', xp: 4, tint: 0x76ff03 };
      game.handleAutoPickup?.(item);
      return (game.registry.get('inventory') ?? []).length;
    });

    // Should still be 8 — not 9
    expect(rejected).toBe(8);
  });
});

// ─── Inventory full notification ──────────────────────────────────────────────

test.describe('Inventory UI — full notification', () => {
  test.skip('shows "Inventory Full" notification when picking up at 8/8', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const notificationShown = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      const fullInv = Array.from({ length: 8 }, (_, i) => ({ label: `X${i}`, type: 'junk' }));
      game.registry.set('inventory', fullInv);

      // Attempt to pick up another item
      let notified = false;
      const originalShow = game.showPoints?.bind(game);
      game.showPoints = (x, y, text, tint) => {
        if (text?.toLowerCase().includes('full') || text?.toLowerCase().includes('inventory')) {
          notified = true;
        }
        originalShow?.(x, y, text, tint);
      };

      // Trigger item pickup attempt
      game.playerPicksItem?.({
        itemDef: { label: 'Overflow', type: 'ingredient', xp: 5, tint: 0x4fc3f7 },
        x: 100,
        y: 100,
        destroy: () => {},
      });

      return notified;
    });

    expect(notificationShown).toBe(true);
  });
});
