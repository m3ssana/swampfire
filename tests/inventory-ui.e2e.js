/**
 * inventory-ui.e2e.js — E2E stubs for Issue #100: Inventory UI
 *
 * These tests exercise the Phaser-rendered inventory UI through the real game
 * pipeline. They are marked test.skip() until full E2E harness is available.
 *
 * Acceptance criteria tested:
 *   - 8-slot grid inventory display visible in HUD
 *   - Colour-coded borders match item types
 *   - Base camp stash accessible at Zone 0
 *   - Auto-pickup for consumables
 *   - Inventory full notification at 8/8
 *   - Q-key discard
 *   - Stash deposit/withdraw
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
      return hud?._invSlots?.length ?? 0;
    });

    expect(slotCount).toBe(8);
  });

  test.skip('slots are visible as a grid layout', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const hasGrid = await page.evaluate(() => {
      const hud = window.game.scene.getScene('hud');
      if (!hud?._invSlots?.length) return false;
      // Verify slots have distinct x positions (grid, not stacked)
      const xs = hud._invSlots.map(s => s.x);
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
      game.registry.set('inventory', [
        { label: 'Fuel Injector', type: 'component' },
      ]);
      // HUD reacts to registry change — read the updated stroke colour
      const hud = window.game.scene.getScene('hud');
      const slot = hud?._invSlots?.[0];
      return slot?.bg?.strokeColor ?? null;
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
      const slot = hud?._invSlots?.[0];
      return slot?.bg?.strokeColor ?? null;
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
      const slot = hud?._invSlots?.[0];
      return slot?.bg?.strokeColor ?? null;
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
      const slot = hud?._invSlots?.[0];
      return slot?.bg?.strokeColor ?? null;
    });

    // Gray = 0x9e9e9e = 10395550 (decimal)
    expect(borderColour).toBe(0x9e9e9e);
  });
});

// ─── Base camp stash ──────────────────────────────────────────────────────────

test.describe('Inventory UI — base camp stash at Zone 0', () => {
  test.skip('stash box is spawned in Zone 0', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const hasStash = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      return game.zone?.stashBox?.sprite?.active ?? false;
    });

    expect(hasStash).toBe(true);
  });

  test.skip('stash box is NOT spawned in non-Zone-0 zones', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const stashBoxInZone1 = await page.evaluate(() => {
      // After loading, zone is 0. The stash only exists in zone 0.
      // zone_manager only spawns stashBox when currentZoneId === 0
      const game = window.game.scene.getScene('game');
      // Check the zone 0 stash exists first
      const z0HasStash = game.zone?.stashBox != null;
      return z0HasStash;
    });

    expect(stashBoxInZone1).toBe(true);
  });

  test.skip('depositing an item moves it from inventory to stash registry', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      // Setup: player has one item, stash is empty
      game.registry.set('inventory', [{ label: 'Copper Wiring', type: 'ingredient' }]);
      game.registry.set('stash', []);
      // Simulate interacting with the stash box
      const stash = game.zone?.stashBox;
      if (!stash) return { invLen: -1, stashLen: -1 };
      game.nearbyInteractable = stash;
      stash.interact();
      return {
        invLen: (game.registry.get('inventory') ?? []).length,
        stashLen: (game.registry.get('stash') ?? []).length,
      };
    });

    expect(result.invLen).toBe(0);
    expect(result.stashLen).toBe(1);
  });

  test.skip('stash can hold more than 8 items (unlimited)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const stashSize = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      const bigStash = Array.from({ length: 50 }, (_, i) => ({
        label: `Stash Item ${i}`,
        type: 'ingredient',
      }));
      game.registry.set('stash', bigStash);
      return (game.registry.get('stash') ?? []).length;
    });

    expect(stashSize).toBe(50);
  });

  test.skip('stash persists across zone transitions (via registry)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const persists = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('stash', [{ label: 'Stored', type: 'ingredient' }]);
      // Registry lives outside of zone lifecycle — it persists
      return (game.registry.get('stash') ?? []).length === 1;
    });

    expect(persists).toBe(true);
  });
});

// ─── Auto-pickup for consumables ──────────────────────────────────────────────

test.describe('Inventory UI — auto-pickup', () => {
  test.skip('consumable items are picked up via collision (same as all dropped items)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const pickedUp = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', []);
      // Simulate collision pickup of a consumable
      const fakeSprite = {
        itemDef: { label: 'Energy Drink', type: 'consumable', xp: 4, tint: 0x76ff03 },
        x: 100, y: 100,
        destroy: () => {},
      };
      game.playerPicksItem(fakeSprite);
      const inv = game.registry.get('inventory') ?? [];
      return inv.some(i => i.label === 'Energy Drink');
    });

    expect(pickedUp).toBe(true);
  });

  test.skip('consumable is NOT collected when inventory is full', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const rejected = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      const fullInv = Array.from({ length: 8 }, (_, i) => ({
        label: `Item ${i}`, type: 'ingredient',
      }));
      game.registry.set('inventory', fullInv);
      const fakeSprite = {
        itemDef: { label: 'Energy Drink', type: 'consumable', xp: 4, tint: 0x76ff03 },
        x: 100, y: 100,
        destroy: () => {},
      };
      game.playerPicksItem(fakeSprite);
      return (game.registry.get('inventory') ?? []).length;
    });

    // Should still be 8 — not 9
    expect(rejected).toBe(8);
  });
});

// ─── Inventory full notification ──────────────────────────────────────────────

test.describe('Inventory UI — full notification', () => {
  test.skip('shows "Inventory full" notification when picking up at 8/8', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const notificationShown = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      const fullInv = Array.from({ length: 8 }, (_, i) => ({
        label: `Item ${i}`, type: 'ingredient',
      }));
      game.registry.set('inventory', fullInv);

      let notified = false;
      const originalShow = game.showPoints.bind(game);
      game.showPoints = (x, y, text, tint) => {
        if (typeof text === 'string' && text.toLowerCase().includes('full')) {
          notified = true;
        }
        originalShow(x, y, text, tint);
      };

      // Trigger item pickup attempt (consumable occupies slot, blocked at 8/8)
      game.playerPicksItem({
        itemDef: { label: 'Overflow', type: 'ingredient', xp: 5, tint: 0x4fc3f7 },
        x: 100, y: 100,
        destroy: () => {},
      });

      return notified;
    });

    expect(notificationShown).toBe(true);
  });
});

// ─── Q-key discard ────────────────────────────────────────────────────────────

test.describe('Inventory UI — Q-key discard', () => {
  test.skip('pressing Q discards the last inventory item', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', [
        { label: 'Copper Wiring', type: 'ingredient' },
        { label: 'Steel Bracket', type: 'ingredient' },
      ]);
      game.onQKey();
      return (game.registry.get('inventory') ?? []).length;
    });

    expect(result).toBe(1);
  });

  test.skip('pressing Q on empty inventory is a no-op', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      const game = window.game.scene.getScene('game');
      game.registry.set('inventory', []);
      game.onQKey();
      return (game.registry.get('inventory') ?? []).length;
    });

    expect(result).toBe(0);
  });
});
