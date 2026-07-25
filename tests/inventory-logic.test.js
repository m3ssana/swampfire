/**
 * inventory-logic.test.js — TDD failing tests for Issue #100
 *
 * Tests the pure inventory_logic.js module (to be created by implementer).
 * Module path: src/gameobjects/inventory_logic.js
 *
 * Type-to-category mapping decision:
 *   Existing loot table types → spec UI categories:
 *     "component"  → rocket components  → gold   (#ffd700)
 *     "ingredient" → crafting materials  → blue   (#4fc3f7)
 *     "consumable" → consumables         → green  (#76ff03)
 *     "junk"       → tools              → gray   (#9e9e9e)
 *
 *   Rationale:
 *   - "component" maps directly to rocket components (crafted at workbench)
 *   - "ingredient" maps to crafting materials (consumed by workbench to make components)
 *   - "junk" maps to tools (misc items: duct tape, wire stripper, bolt set — gray)
 *   - "consumable" is a NEW type for auto-pickup items (energy drinks, water bottles, etc.)
 *     The implementer must add this type for items that should auto-collect.
 *   - Unknown/undefined types get a fallback colour (white #ffffff) to avoid undefined.
 *
 * // inlined from src/gameobjects/inventory_logic.js — keep in sync
 */

import {
  MAX_SLOTS,
  BORDER_COLOURS,
  getBorderColour,
  canAdd,
  addItem,
  isAutoPickup,
  occupiesSlot,
  discardLast,
  toStash,
  fromStash,
  FULL_POPUP_COOLDOWN_MS,
} from '../src/gameobjects/inventory_logic.js';

// ─── Constants ────────────────────────────────────────────────────────────────

describe('Inventory Logic — Constants', () => {
  it('MAX_SLOTS equals 8', () => {
    expect(MAX_SLOTS).toBe(8);
  });

  it('BORDER_COLOURS maps "component" to gold (#ffd700)', () => {
    expect(BORDER_COLOURS.component).toBe('#ffd700');
  });

  it('BORDER_COLOURS maps "ingredient" to blue (#4fc3f7)', () => {
    expect(BORDER_COLOURS.ingredient).toBe('#4fc3f7');
  });

  it('BORDER_COLOURS maps "consumable" to green (#76ff03)', () => {
    expect(BORDER_COLOURS.consumable).toBe('#76ff03');
  });

  it('BORDER_COLOURS maps "junk" to gray (#9e9e9e)', () => {
    expect(BORDER_COLOURS.junk).toBe('#9e9e9e');
  });
});

// ─── getBorderColour ──────────────────────────────────────────────────────────

describe('Inventory Logic — getBorderColour', () => {
  it('returns gold for type "component"', () => {
    expect(getBorderColour('component')).toBe('#ffd700');
  });

  it('returns blue for type "ingredient"', () => {
    expect(getBorderColour('ingredient')).toBe('#4fc3f7');
  });

  it('returns green for type "consumable"', () => {
    expect(getBorderColour('consumable')).toBe('#76ff03');
  });

  it('returns gray for type "junk"', () => {
    expect(getBorderColour('junk')).toBe('#9e9e9e');
  });

  it('returns fallback white (#ffffff) for unknown type', () => {
    expect(getBorderColour('unknown_type_xyz')).toBe('#ffffff');
  });

  it('returns fallback white (#ffffff) for undefined type', () => {
    expect(getBorderColour(undefined)).toBe('#ffffff');
  });

  it('returns fallback white (#ffffff) for null type', () => {
    expect(getBorderColour(null)).toBe('#ffffff');
  });
});

// ─── canAdd ───────────────────────────────────────────────────────────────────

describe('Inventory Logic — canAdd', () => {
  it('returns true when inventory is empty (0/8)', () => {
    expect(canAdd([])).toBe(true);
  });

  it('returns true when inventory has 7 items (boundary: 7/8)', () => {
    const inv = Array.from({ length: 7 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    expect(canAdd(inv)).toBe(true);
  });

  it('returns false when inventory has exactly 8 items (boundary: 8/8)', () => {
    const inv = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    expect(canAdd(inv)).toBe(false);
  });

  it('returns false when inventory has more than 8 items (overflow guard)', () => {
    const inv = Array.from({ length: 10 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    expect(canAdd(inv)).toBe(false);
  });
});

// ─── addItem ──────────────────────────────────────────────────────────────────

describe('Inventory Logic — addItem', () => {
  it('returns success result with new inventory when space available', () => {
    const inv = [{ label: 'Copper Wiring', type: 'ingredient' }];
    const item = { label: 'Steel Bracket', type: 'ingredient' };
    const result = addItem(inv, item);

    expect(result.success).toBe(true);
    expect(result.inventory).toHaveLength(2);
    expect(result.inventory[1]).toEqual({ label: 'Steel Bracket', type: 'ingredient' });
  });

  it('returns failure result when inventory is full (8/8)', () => {
    const inv = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const item = { label: 'New Item', type: 'ingredient' };
    const result = addItem(inv, item);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
  });

  it('does not include the new item in inventory on failure', () => {
    const inv = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const item = { label: 'New Item', type: 'ingredient' };
    const result = addItem(inv, item);

    expect(result.inventory).toHaveLength(8);
    expect(result.inventory).not.toContainEqual({ label: 'New Item', type: 'ingredient' });
  });

  it('succeeds at exactly 7/8 (boundary — one slot remaining)', () => {
    const inv = Array.from({ length: 7 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const item = { label: 'Last Slot', type: 'component' };
    const result = addItem(inv, item);

    expect(result.success).toBe(true);
    expect(result.inventory).toHaveLength(8);
    expect(result.inventory[7]).toEqual({ label: 'Last Slot', type: 'component' });
  });

  // Immutability
  it('does NOT mutate the original inventory array on success', () => {
    const inv = [{ label: 'Copper Wiring', type: 'ingredient' }];
    const original = [...inv];
    addItem(inv, { label: 'New', type: 'junk' });

    expect(inv).toHaveLength(1);
    expect(inv).toEqual(original);
  });

  it('does NOT mutate the original inventory array on failure', () => {
    const inv = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const original = [...inv];
    addItem(inv, { label: 'Overflow', type: 'junk' });

    expect(inv).toHaveLength(8);
    expect(inv).toEqual(original);
  });

  it('returns a NEW array reference on success (not the same object)', () => {
    const inv = [{ label: 'A', type: 'junk' }];
    const result = addItem(inv, { label: 'B', type: 'junk' });

    expect(result.inventory).not.toBe(inv);
  });
});

// ─── isAutoPickup ─────────────────────────────────────────────────────────────

describe('Inventory Logic — isAutoPickup', () => {
  it('returns true for items with type "consumable"', () => {
    expect(isAutoPickup({ label: 'Energy Drink', type: 'consumable' })).toBe(true);
  });

  it('returns false for items with type "ingredient"', () => {
    expect(isAutoPickup({ label: 'Copper Wiring', type: 'ingredient' })).toBe(false);
  });

  it('returns false for items with type "component"', () => {
    expect(isAutoPickup({ label: 'Fuel Injector', type: 'component' })).toBe(false);
  });

  it('returns false for items with type "junk"', () => {
    expect(isAutoPickup({ label: 'Wire Stripper', type: 'junk' })).toBe(false);
  });

  it('returns false for items with unknown type', () => {
    expect(isAutoPickup({ label: 'Mystery', type: 'alien' })).toBe(false);
  });
});

// ─── Stash — toStash ──────────────────────────────────────────────────────────

describe('Inventory Logic — toStash (transfer to base stash)', () => {
  it('moves an item from inventory to stash when in Zone 0', () => {
    const inv = [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Steel Bracket', type: 'ingredient' },
    ];
    const stash = [];
    const result = toStash(inv, stash, 0, 0); // itemIndex=0, currentZone=0

    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toEqual({ label: 'Steel Bracket', type: 'ingredient' });
    expect(result.stash).toHaveLength(1);
    expect(result.stash[0]).toEqual({ label: 'Copper Wiring', type: 'ingredient' });
  });

  it('rejects transfer when NOT in Zone 0', () => {
    const inv = [{ label: 'Copper Wiring', type: 'ingredient' }];
    const stash = [];
    const result = toStash(inv, stash, 0, 2); // itemIndex=0, currentZone=2

    expect(result.success).toBe(false);
    expect(result.reason).toBe('not_at_base');
    // Original arrays unchanged
    expect(result.inventory).toHaveLength(1);
    expect(result.stash).toHaveLength(0);
  });

  it('stash has unlimited capacity (can hold 100+ items)', () => {
    const inv = [{ label: 'New Item', type: 'ingredient' }];
    const stash = Array.from({ length: 100 }, (_, i) => ({ label: `Stash ${i}`, type: 'junk' }));
    const result = toStash(inv, stash, 0, 0);

    expect(result.success).toBe(true);
    expect(result.stash).toHaveLength(101);
  });

  it('does NOT mutate the original inventory array', () => {
    const inv = [{ label: 'A', type: 'junk' }, { label: 'B', type: 'junk' }];
    const original = [...inv];
    toStash(inv, [], 0, 0);

    expect(inv).toEqual(original);
  });

  it('does NOT mutate the original stash array', () => {
    const inv = [{ label: 'A', type: 'junk' }];
    const stash = [{ label: 'X', type: 'junk' }];
    const originalStash = [...stash];
    toStash(inv, stash, 0, 0);

    expect(stash).toEqual(originalStash);
  });
});

// ─── Stash — fromStash ────────────────────────────────────────────────────────

describe('Inventory Logic — fromStash (retrieve from base stash)', () => {
  it('moves an item from stash to inventory when in Zone 0 and inventory has space', () => {
    const inv = [{ label: 'Existing', type: 'junk' }];
    const stash = [{ label: 'Stored Item', type: 'ingredient' }];
    const result = fromStash(inv, stash, 0, 0); // stashIndex=0, currentZone=0

    expect(result.success).toBe(true);
    expect(result.inventory).toHaveLength(2);
    expect(result.inventory[1]).toEqual({ label: 'Stored Item', type: 'ingredient' });
    expect(result.stash).toHaveLength(0);
  });

  it('rejects retrieval when NOT in Zone 0', () => {
    const inv = [];
    const stash = [{ label: 'Stored', type: 'ingredient' }];
    const result = fromStash(inv, stash, 0, 3); // stashIndex=0, currentZone=3

    expect(result.success).toBe(false);
    expect(result.reason).toBe('not_at_base');
  });

  it('rejects retrieval when inventory is full (8/8)', () => {
    const inv = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const stash = [{ label: 'Stored', type: 'ingredient' }];
    const result = fromStash(inv, stash, 0, 0); // stashIndex=0, currentZone=0

    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
  });

  it('succeeds at 7/8 inventory (boundary — one slot remaining)', () => {
    const inv = Array.from({ length: 7 }, (_, i) => ({ label: `Item ${i}`, type: 'junk' }));
    const stash = [{ label: 'Retrieved', type: 'component' }];
    const result = fromStash(inv, stash, 0, 0);

    expect(result.success).toBe(true);
    expect(result.inventory).toHaveLength(8);
  });

  it('does NOT mutate the original inventory array', () => {
    const inv = [{ label: 'A', type: 'junk' }];
    const stash = [{ label: 'B', type: 'ingredient' }];
    const original = [...inv];
    fromStash(inv, stash, 0, 0);

    expect(inv).toEqual(original);
  });

  it('does NOT mutate the original stash array', () => {
    const inv = [];
    const stash = [{ label: 'A', type: 'junk' }, { label: 'B', type: 'junk' }];
    const originalStash = [...stash];
    fromStash(inv, stash, 0, 0);

    expect(stash).toEqual(originalStash);
  });
});

// ─── Integration scenarios ────────────────────────────────────────────────────

describe('Inventory Logic — Integration scenarios', () => {
  it('full workflow: add items until full, then stash to free space', () => {
    let inv = [];
    // Fill to 8
    for (let i = 0; i < 8; i++) {
      const result = addItem(inv, { label: `Item ${i}`, type: 'ingredient' });
      expect(result.success).toBe(true);
      inv = result.inventory;
    }
    // 9th item fails
    const overflow = addItem(inv, { label: 'Overflow', type: 'ingredient' });
    expect(overflow.success).toBe(false);
    expect(overflow.reason).toBe('inventory_full');

    // Stash one item to free a slot
    const stashResult = toStash(inv, [], 0, 0);
    expect(stashResult.inventory).toHaveLength(7);
    expect(stashResult.stash).toHaveLength(1);

    // Now can add again
    const addAgain = addItem(stashResult.inventory, { label: 'New', type: 'junk' });
    expect(addAgain.success).toBe(true);
    expect(addAgain.inventory).toHaveLength(8);
  });

  it('auto-pickup consumable respects inventory capacity', () => {
    const consumable = { label: 'Energy Drink', type: 'consumable' };
    expect(isAutoPickup(consumable)).toBe(true);

    // With space — auto-pickup would succeed
    const emptyResult = addItem([], consumable);
    expect(emptyResult.success).toBe(true);

    // At 8/8 — auto-pickup should NOT add
    const fullInv = Array.from({ length: 8 }, (_, i) => ({ label: `X${i}`, type: 'junk' }));
    const fullResult = addItem(fullInv, consumable);
    expect(fullResult.success).toBe(false);
    expect(fullResult.reason).toBe('inventory_full');
  });
});

// ─── occupiesSlot (Fix 1) ─────────────────────────────────────────────────────

describe('Inventory Logic — occupiesSlot', () => {
  it('returns true for type "ingredient"', () => {
    expect(occupiesSlot({ label: 'Copper Wiring', type: 'ingredient' })).toBe(true);
  });

  it('returns true for type "component"', () => {
    expect(occupiesSlot({ label: 'Fuel Injector', type: 'component' })).toBe(true);
  });

  it('returns true for type "consumable"', () => {
    expect(occupiesSlot({ label: 'Energy Drink', type: 'consumable' })).toBe(true);
  });

  it('returns false for type "junk"', () => {
    expect(occupiesSlot({ label: 'Wire Stripper', type: 'junk' })).toBe(false);
  });

  it('returns false for undefined type', () => {
    expect(occupiesSlot({ label: 'Mystery' })).toBe(false);
  });

  it('returns false for null type', () => {
    expect(occupiesSlot({ label: 'Null', type: null })).toBe(false);
  });

  it('returns false for "Empty" junk items', () => {
    expect(occupiesSlot({ label: 'Empty', type: 'junk' })).toBe(false);
  });
});

// ─── discardLast (Fix 2) ──────────────────────────────────────────────────────

describe('Inventory Logic — discardLast', () => {
  it('removes the last item from inventory and returns it', () => {
    const inv = [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Steel Bracket', type: 'ingredient' },
    ];
    const result = discardLast(inv);

    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toEqual({ label: 'Copper Wiring', type: 'ingredient' });
    expect(result.discarded).toEqual({ label: 'Steel Bracket', type: 'ingredient' });
  });

  it('returns null discarded and unchanged inventory when empty', () => {
    const result = discardLast([]);

    expect(result.inventory).toHaveLength(0);
    expect(result.discarded).toBeNull();
  });

  it('does NOT mutate the original inventory array', () => {
    const inv = [{ label: 'A', type: 'junk' }, { label: 'B', type: 'ingredient' }];
    const original = [...inv];
    discardLast(inv);

    expect(inv).toEqual(original);
  });

  it('returns a NEW array reference (not the same object)', () => {
    const inv = [{ label: 'A', type: 'ingredient' }];
    const result = discardLast(inv);

    expect(result.inventory).not.toBe(inv);
  });

  it('works correctly with a single item', () => {
    const inv = [{ label: 'Only', type: 'component' }];
    const result = discardLast(inv);

    expect(result.inventory).toHaveLength(0);
    expect(result.discarded).toEqual({ label: 'Only', type: 'component' });
  });
});

// ─── FULL_POPUP_COOLDOWN_MS (Fix 5) ──────────────────────────────────────────

describe('Inventory Logic — FULL_POPUP_COOLDOWN_MS', () => {
  it('is exported as a positive number', () => {
    expect(FULL_POPUP_COOLDOWN_MS).toBeGreaterThan(0);
  });

  it('is at least 1000ms to prevent spam', () => {
    expect(FULL_POPUP_COOLDOWN_MS).toBeGreaterThanOrEqual(1000);
  });
});

// ─── Stash defensive reads (Fix 6) ───────────────────────────────────────────

describe('Inventory Logic — stash defensive behavior', () => {
  it('toStash handles undefined stash by treating it as empty', () => {
    const inv = [{ label: 'Item', type: 'ingredient' }];
    // Simulate undefined stash with null/undefined
    const result = toStash(inv, undefined, 0, 0);

    expect(result.success).toBe(true);
    expect(result.stash).toHaveLength(1);
  });

  it('fromStash handles undefined stash gracefully', () => {
    const inv = [{ label: 'Item', type: 'ingredient' }];
    const result = fromStash(inv, undefined, 0, 0);

    expect(result.success).toBe(false);
    // Should not throw — just return a failure
  });

  it('toStash handles null stash by treating it as empty', () => {
    const inv = [{ label: 'Item', type: 'ingredient' }];
    const result = toStash(inv, null, 0, 0);

    expect(result.success).toBe(true);
    expect(result.stash).toHaveLength(1);
  });

  it('fromStash handles null stash gracefully', () => {
    const inv = [{ label: 'Item', type: 'ingredient' }];
    const result = fromStash(inv, null, 0, 0);

    expect(result.success).toBe(false);
  });
});

// ─── Integration: junk does not fill slots (Fix 1 + existing addItem) ─────────

describe('Inventory Logic — junk bypass integration', () => {
  it('a player cannot softlock by filling all 8 slots with junk', () => {
    // Only items where occupiesSlot() is true should count toward the 8-slot limit.
    // Junk never occupies a slot, so even with 100 junk pickups, addItem() for
    // ingredients/components should still succeed.
    const junkItem = { label: 'Duct Tape', type: 'junk' };
    const ingredientItem = { label: 'Copper Wiring', type: 'ingredient' };

    // occupiesSlot is the gatekeeper — junk is excluded before addItem is called
    expect(occupiesSlot(junkItem)).toBe(false);
    expect(occupiesSlot(ingredientItem)).toBe(true);

    // If the game correctly skips addItem for junk, an inventory can always accept ingredients
    let inv = [];
    for (let i = 0; i < 7; i++) {
      const result = addItem(inv, ingredientItem);
      inv = result.inventory;
    }
    // 7/8 used — still room for one more
    expect(canAdd(inv)).toBe(true);
    const finalAdd = addItem(inv, ingredientItem);
    expect(finalAdd.success).toBe(true);
  });
});
