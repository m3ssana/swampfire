/**
 * Checklist Logic — pure JS, no Phaser dependency.
 *
 * Powers:
 *   - Issue #94: System Checklist overlay (TAB key)
 *   - Issue #99: Pause Menu system summary
 *
 * Exports:
 *   STATUS, STATUS_SYMBOLS, STATUS_COLORS — enums
 *   RECIPES — the 5-system recipe array
 *   getIngredientZones(label) — which zones contain this ingredient
 *   buildChecklist({ systemsInstalled, inventory }) — full 5-row status
 *   formatProgress(installed, total) — "N/T systems (XX%)"
 */

// ── Status enum ────────────────────────────────────────────────────────────────

export const STATUS = {
  INSTALLED:    'installed',
  IN_INVENTORY: 'in_inventory',
  NEEDED:       'needed',
};

export const STATUS_SYMBOLS = {
  INSTALLED:    '[X]',
  IN_INVENTORY: '[/]',
  NEEDED:       '[ ]',
};

export const STATUS_COLORS = {
  INSTALLED:    'green',
  IN_INVENTORY: 'yellow',
  NEEDED:       'gray',
};

// ── Recipe data (matches ROCKET_SYSTEMS order in workbench.js) ─────────────────

export const RECIPES = [
  {
    systemLabel:    'Engine',
    componentLabel: 'Fuel Injector',
    ingredients:    [{ label: 'Solenoid Valve' }, { label: 'Copper Wiring' }],
  },
  {
    systemLabel:    'Propellant',
    componentLabel: 'Oxidizer Tank',
    ingredients:    [{ label: 'Lab Oxidizer Compound' }, { label: 'Gas Cylinder' }],
  },
  {
    systemLabel:    'Guidance',
    componentLabel: 'Avionics Board',
    ingredients:    [{ label: 'RC Transmitter' }, { label: 'LiPo Battery Pack' }],
  },
  {
    systemLabel:    'Power',
    componentLabel: 'Battery Array',
    ingredients:    [{ label: 'Car Battery x2' }, { label: 'Jumper Cables' }],
  },
  {
    systemLabel:    'Fuel Safety',
    componentLabel: 'Pressure Regulator',
    ingredients:    [{ label: 'Hydraulic Seal' }, { label: 'PVC Coupler' }],
  },
];

// ── Zone names (mirrors ZONES catalogue in zone_manager.js) ────────────────────

const ZONE_NAMES = {
  0: 'Cypress Creek Preserve',
  1: 'US-41 Corridor',
  2: 'Collier Commons',
  3: 'Conner Preserve',
  4: 'LOLHS / SR-54',
};

// ── Loot tables (ingredient entries only, mirroring searchable_container.js) ───
// We only need the labels from each table — no XP/weight/tint needed here.

export const LOOT_TABLE_INGREDIENTS = {
  default:  ['Copper Wiring', 'Solenoid Valve', 'Hydraulic Seal', 'PVC Coupler'],
  toolbox:  ['Copper Wiring', 'Solenoid Valve', 'Steel Bracket'],
  cooler:   ['Hydraulic Seal', 'PVC Coupler'],
  backpack: ['Copper Wiring', 'AA Batteries', 'Multi-tool'],
  crate:    ['Hydraulic Seal', 'Steel Bracket', 'Pressure Gauge', 'Copper Wiring'],
};

// ── Which zones carry which loot tables ────────────────────────────────────────
// Derived from the actual Tiled JSON maps (zone0-4).

const ZONE_TABLES = {
  0: ['default', 'toolbox', 'cooler', 'backpack', 'crate'],
  1: ['default', 'toolbox', 'cooler', 'backpack', 'crate'],
  2: ['default', 'toolbox', 'cooler', 'backpack', 'crate'],
  3: ['default', 'toolbox', 'backpack', 'crate'],           // no cooler
  4: ['default', 'toolbox', 'cooler', 'crate'],             // no backpack
};

// ── Recipe-specific ingredient zone assignments ────────────────────────────────
// Ingredients that appear in RECIPES but NOT in any loot table get explicit zone
// designations based on world design (NPC quests, zone-specific spawns, chem lab).
// This ensures getIngredientZones() always returns a non-empty array for recipe
// ingredients, giving players useful zone hints in the checklist overlay.

const RECIPE_INGREDIENT_ZONES = {
  'Lab Oxidizer Compound': [4, 2],    // LOLHS chem lab, Collier Foundry
  'Gas Cylinder':          [1, 4],    // US-41 hardware stores, Tractor Supply
  'RC Transmitter':        [3],       // Conner Preserve RC Flying Field
  'LiPo Battery Pack':     [3, 1],    // Conner Preserve RC Field, US-41 shops
  'Car Battery x2':        [1, 4],    // US-41 auto parts (NAPA, O'Reilly), Tractor Supply
  'Jumper Cables':         [1, 4],    // US-41 auto parts, Tractor Supply
};

// Pre-built reverse index: ingredientLabel → Set of zone IDs
const _ingredientZoneCache = new Map();

function _buildIngredientZoneIndex() {
  // 1. Index loot-table ingredients by zone
  for (const [zoneId, tables] of Object.entries(ZONE_TABLES)) {
    for (const tableKey of tables) {
      const ingredients = LOOT_TABLE_INGREDIENTS[tableKey] ?? [];
      for (const label of ingredients) {
        if (!_ingredientZoneCache.has(label)) {
          _ingredientZoneCache.set(label, new Set());
        }
        _ingredientZoneCache.get(label).add(Number(zoneId));
      }
    }
  }

  // 2. Add recipe-specific ingredient zones (quest/zone-exclusive items)
  for (const [label, zones] of Object.entries(RECIPE_INGREDIENT_ZONES)) {
    if (!_ingredientZoneCache.has(label)) {
      _ingredientZoneCache.set(label, new Set());
    }
    for (const z of zones) {
      _ingredientZoneCache.get(label).add(z);
    }
  }
}

_buildIngredientZoneIndex();

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns an array of zone display names where the given ingredient can be found.
 * @param {string} ingredientLabel
 * @returns {string[]}
 */
export function getIngredientZones(ingredientLabel) {
  const zoneIds = _ingredientZoneCache.get(ingredientLabel);
  if (!zoneIds || zoneIds.size === 0) return [];
  return [...zoneIds].sort((a, b) => a - b).map(id => ZONE_NAMES[id]);
}

/**
 * Builds the full 5-row system checklist from current game state.
 *
 * @param {{ systemsInstalled: number, inventory: Array<{ label: string, type: string }> }} state
 * @returns {ChecklistRow[]}
 */
export function buildChecklist({ systemsInstalled, inventory }) {
  // Build a set of inventory labels by type for fast lookup
  const componentLabels = new Set();
  const ingredientLabels = new Set();

  for (const item of inventory) {
    if (item.type === 'component') {
      componentLabels.add(item.label);
    } else if (item.type === 'ingredient') {
      ingredientLabels.add(item.label);
    }
    // junk is ignored
  }

  return RECIPES.map((recipe, index) => {
    let status;
    let ingredientStatuses;

    if (index < systemsInstalled) {
      // This system is installed on the rocket
      status = STATUS.INSTALLED;
      ingredientStatuses = recipe.ingredients.map(ing => ({
        label:  ing.label,
        status: STATUS.INSTALLED,
        zones:  [], // no longer needed — already installed
      }));
    } else if (componentLabels.has(recipe.componentLabel)) {
      // The crafted component is in inventory but not yet installed
      status = STATUS.IN_INVENTORY;
      ingredientStatuses = recipe.ingredients.map(ing => ({
        label:  ing.label,
        status: STATUS.IN_INVENTORY,
        zones:  getIngredientZones(ing.label),
      }));
    } else {
      // System is still needed
      status = STATUS.NEEDED;
      ingredientStatuses = recipe.ingredients.map(ing => {
        const ingStatus = ingredientLabels.has(ing.label)
          ? STATUS.IN_INVENTORY
          : STATUS.NEEDED;
        return {
          label:  ing.label,
          status: ingStatus,
          zones:  getIngredientZones(ing.label),
        };
      });
    }

    return {
      systemIndex:    index,
      systemLabel:    recipe.systemLabel,
      componentLabel: recipe.componentLabel,
      status,
      ingredients:    ingredientStatuses,
    };
  });
}

/**
 * Formats the progress string shown in the overlay header.
 * @param {number} installed - Number of installed systems
 * @param {number} total     - Total systems required
 * @returns {string} e.g. "3/5 systems (60%)"
 */
export function formatProgress(installed, total) {
  const pct = total === 0 ? 0 : Math.round((installed / total) * 100);
  return `${installed}/${total} systems (${pct}%)`;
}
