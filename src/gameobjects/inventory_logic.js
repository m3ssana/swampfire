/**
 * inventory_logic.js — Pure inventory management logic (no Phaser dependency)
 *
 * All functions are pure and immutable — they return new arrays, never mutate input.
 * Used by HUD scene for rendering the 8-slot grid and by game.js for pickup/stash logic.
 *
 * Type-to-category mapping:
 *   "component"  → rocket components  → gold   (#ffd700)
 *   "ingredient" → crafting materials  → blue   (#4fc3f7)
 *   "consumable" → consumables         → green  (#76ff03)
 *   "junk"       → tools/flavour       → gray   (#9e9e9e)  — does NOT occupy a slot
 */

/** Maximum inventory slots the player can carry */
export const MAX_SLOTS = 8;

/** Cooldown (ms) between duplicate "Inventory full" popups to prevent spam */
export const FULL_POPUP_COOLDOWN_MS = 1500;

/** Border colour map for the HUD inventory grid — keyed by item type */
export const BORDER_COLOURS = {
  component:  '#ffd700',  // gold — rocket components
  ingredient: '#4fc3f7',  // blue — crafting materials
  consumable: '#76ff03',  // green — consumables (auto-pickup)
  junk:       '#9e9e9e',  // gray — tools/misc
};

/**
 * Returns the border colour for a given item type.
 * Falls back to white (#ffffff) for unknown/undefined/null types.
 * @param {string|undefined|null} type
 * @returns {string} Hex colour string
 */
export function getBorderColour(type) {
  return BORDER_COLOURS[type] ?? '#ffffff';
}

/**
 * Determines whether an item occupies an inventory slot.
 * Junk/flavour items (type "junk" or undefined/null) do NOT consume slots —
 * they award XP on pickup but pass through the inventory.
 * Only "ingredient", "component", and "consumable" items occupy slots.
 *
 * @param {object} item - Item with a `type` field
 * @returns {boolean}
 */
export function occupiesSlot(item) {
  const type = item?.type;
  return type === 'ingredient' || type === 'component' || type === 'consumable';
}

/**
 * Checks whether the inventory has room for at least one more item.
 * @param {Array} inventory
 * @returns {boolean}
 */
export function canAdd(inventory) {
  return inventory.length < MAX_SLOTS;
}

/**
 * Attempts to add an item to the inventory (immutable).
 * @param {Array} inventory - Current inventory array
 * @param {object} item - Item to add ({ label, type })
 * @returns {{ success: boolean, inventory: Array, reason?: string }}
 */
export function addItem(inventory, item) {
  if (!canAdd(inventory)) {
    return {
      success: false,
      inventory: [...inventory],
      reason: 'inventory_full',
    };
  }
  return {
    success: true,
    inventory: [...inventory, item],
  };
}

/**
 * Determines if an item should be auto-picked-up (without E-key interaction).
 * Only consumable items auto-collect.
 * @param {object} item - Item with a `type` field
 * @returns {boolean}
 */
export function isAutoPickup(item) {
  return item.type === 'consumable';
}

/**
 * Removes the last item from inventory and returns it (immutable).
 * Used by the Q-key discard mechanic — drops the most recently picked item.
 * Returns null discarded if inventory is empty (no-op).
 *
 * @param {Array} inventory - Current inventory array
 * @returns {{ inventory: Array, discarded: object|null }}
 */
export function discardLast(inventory) {
  if (!inventory || inventory.length === 0) {
    return { inventory: [], discarded: null };
  }
  const discarded = inventory[inventory.length - 1];
  return {
    inventory: inventory.slice(0, -1),
    discarded,
  };
}

/**
 * Transfers an item from player inventory to the base-camp stash.
 * Only works in Zone 0. Stash has unlimited capacity.
 * @param {Array} inventory - Current player inventory
 * @param {Array|null|undefined} stash - Current stash contents (defensive: treats null/undefined as [])
 * @param {number} itemIndex - Index in inventory to move
 * @param {number} currentZone - Current zone ID (must be 0)
 * @returns {{ success: boolean, inventory: Array, stash: Array, reason?: string }}
 */
export function toStash(inventory, stash, itemIndex, currentZone) {
  const safeStash = stash ?? [];

  if (currentZone !== 0) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...safeStash],
      reason: 'not_at_base',
    };
  }

  const item = inventory[itemIndex];
  const newInventory = [...inventory.slice(0, itemIndex), ...inventory.slice(itemIndex + 1)];
  const newStash = [...safeStash, item];

  return {
    success: true,
    inventory: newInventory,
    stash: newStash,
  };
}

/**
 * Retrieves an item from the base-camp stash into player inventory.
 * Only works in Zone 0. Fails if inventory is full.
 * @param {Array} inventory - Current player inventory
 * @param {Array|null|undefined} stash - Current stash contents (defensive: treats null/undefined as [])
 * @param {number} stashIndex - Index in stash to retrieve
 * @param {number} currentZone - Current zone ID (must be 0)
 * @returns {{ success: boolean, inventory: Array, stash: Array, reason?: string }}
 */
export function fromStash(inventory, stash, stashIndex, currentZone) {
  const safeStash = stash ?? [];

  if (currentZone !== 0) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...safeStash],
      reason: 'not_at_base',
    };
  }

  if (!canAdd(inventory)) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...safeStash],
      reason: 'inventory_full',
    };
  }

  // Guard: stash is empty or index out of range
  if (safeStash.length === 0 || stashIndex >= safeStash.length) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...safeStash],
      reason: 'stash_empty',
    };
  }

  const item = safeStash[stashIndex];
  const newStash = [...safeStash.slice(0, stashIndex), ...safeStash.slice(stashIndex + 1)];
  const newInventory = [...inventory, item];

  return {
    success: true,
    inventory: newInventory,
    stash: newStash,
  };
}
