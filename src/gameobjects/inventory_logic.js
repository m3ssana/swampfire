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
 *   "junk"       → tools              → gray   (#9e9e9e)
 */

/** Maximum inventory slots the player can carry */
export const MAX_SLOTS = 8;

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
 * Transfers an item from player inventory to the base-camp stash.
 * Only works in Zone 0. Stash has unlimited capacity.
 * @param {Array} inventory - Current player inventory
 * @param {Array} stash - Current stash contents
 * @param {number} itemIndex - Index in inventory to move
 * @param {number} currentZone - Current zone ID (must be 0)
 * @returns {{ success: boolean, inventory: Array, stash: Array, reason?: string }}
 */
export function toStash(inventory, stash, itemIndex, currentZone) {
  if (currentZone !== 0) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...stash],
      reason: 'not_at_base',
    };
  }

  const item = inventory[itemIndex];
  const newInventory = [...inventory.slice(0, itemIndex), ...inventory.slice(itemIndex + 1)];
  const newStash = [...stash, item];

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
 * @param {Array} stash - Current stash contents
 * @param {number} stashIndex - Index in stash to retrieve
 * @param {number} currentZone - Current zone ID (must be 0)
 * @returns {{ success: boolean, inventory: Array, stash: Array, reason?: string }}
 */
export function fromStash(inventory, stash, stashIndex, currentZone) {
  if (currentZone !== 0) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...stash],
      reason: 'not_at_base',
    };
  }

  if (!canAdd(inventory)) {
    return {
      success: false,
      inventory: [...inventory],
      stash: [...stash],
      reason: 'inventory_full',
    };
  }

  const item = stash[stashIndex];
  const newStash = [...stash.slice(0, stashIndex), ...stash.slice(stashIndex + 1)];
  const newInventory = [...inventory, item];

  return {
    success: true,
    inventory: newInventory,
    stash: newStash,
  };
}
