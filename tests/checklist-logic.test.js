/**
 * Tests for src/gameobjects/checklist_logic.js — Issue #94
 *
 * This module is a PURE-JS, Phaser-free logic layer powering:
 *   - The System Checklist overlay (TAB key, issue #94)
 *   - The Pause Menu system summary (issue #99)
 *
 * It exports:
 *   buildChecklist({ systemsInstalled, inventory })  → ChecklistRow[]
 *   formatProgress(installed, total)                 → string
 *   STATUS                                           → { INSTALLED, IN_INVENTORY, NEEDED }
 *   STATUS_SYMBOLS                                   → { INSTALLED: '[X]', IN_INVENTORY: '[/]', NEEDED: '[ ]' }
 *   STATUS_COLORS                                    → { INSTALLED: 'green', IN_INVENTORY: 'yellow', NEEDED: 'gray' }
 *   RECIPES                                          → the 5-system recipe array (for external consumption)
 *   getIngredientZones(ingredientLabel)              → string[] of zone names
 *
 * ChecklistRow shape:
 *   { systemIndex, systemLabel, componentLabel, status, ingredients: [{ label, status, zones }] }
 */

import { describe, it, expect } from 'vitest';
import {
  buildChecklist,
  formatProgress,
  STATUS,
  STATUS_SYMBOLS,
  STATUS_COLORS,
  RECIPES,
  getIngredientZones,
  LOOT_TABLE_INGREDIENTS,
} from '../src/gameobjects/checklist_logic.js';

// ─── Inlined constants from src/gameobjects/workbench.js — keep in sync ───────
const ROCKET_SYSTEMS = [
  { label: 'Fuel Injector',      xp: 15, tint: 0xff6600 },
  { label: 'Oxidizer Tank',      xp: 15, tint: 0x00ccff },
  { label: 'Avionics Board',     xp: 15, tint: 0x00ff88 },
  { label: 'Battery Array',      xp: 15, tint: 0xffee00 },
  { label: 'Pressure Regulator', xp: 15, tint: 0xff44aa },
];

// ─── Inlined zone names from src/gameobjects/zone_manager.js — keep in sync ──
const ZONE_NAMES = {
  0: 'Cypress Creek Preserve',
  1: 'US-41 Corridor',
  2: 'Collier Commons',
  3: 'Conner Preserve',
  4: 'LOLHS / SR-54',
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS ENUM & SYMBOLS
// ═══════════════════════════════════════════════════════════════════════════════

describe('STATUS constants', () => {
  it('exports three status values: INSTALLED, IN_INVENTORY, NEEDED', () => {
    expect(STATUS.INSTALLED).toBe('installed');
    expect(STATUS.IN_INVENTORY).toBe('in_inventory');
    expect(STATUS.NEEDED).toBe('needed');
  });

  it('STATUS_SYMBOLS maps each status to its display symbol', () => {
    expect(STATUS_SYMBOLS.INSTALLED).toBe('[X]');
    expect(STATUS_SYMBOLS.IN_INVENTORY).toBe('[/]');
    expect(STATUS_SYMBOLS.NEEDED).toBe('[ ]');
  });

  it('STATUS_COLORS maps each status to its color name', () => {
    expect(STATUS_COLORS.INSTALLED).toBe('green');
    expect(STATUS_COLORS.IN_INVENTORY).toBe('yellow');
    expect(STATUS_COLORS.NEEDED).toBe('gray');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════════════════════════════════════════

describe('RECIPES constant', () => {
  it('contains exactly 5 recipes', () => {
    expect(RECIPES).toHaveLength(5);
  });

  it('each recipe has systemLabel, componentLabel, and ingredients array of length 2', () => {
    for (const recipe of RECIPES) {
      expect(recipe).toHaveProperty('systemLabel');
      expect(recipe).toHaveProperty('componentLabel');
      expect(recipe.ingredients).toHaveLength(2);
      for (const ing of recipe.ingredients) {
        expect(ing).toHaveProperty('label');
      }
    }
  });

  it('system labels match ROCKET_SYSTEMS from workbench.js in order', () => {
    // inlined from src/gameobjects/workbench.js — keep in sync
    expect(RECIPES[0].componentLabel).toBe('Fuel Injector');
    expect(RECIPES[1].componentLabel).toBe('Oxidizer Tank');
    expect(RECIPES[2].componentLabel).toBe('Avionics Board');
    expect(RECIPES[3].componentLabel).toBe('Battery Array');
    expect(RECIPES[4].componentLabel).toBe('Pressure Regulator');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatProgress
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatProgress', () => {
  it('returns "0/5 systems (0%)" when nothing installed', () => {
    expect(formatProgress(0, 5)).toBe('0/5 systems (0%)');
  });

  it('returns "1/5 systems (20%)" with 1 installed', () => {
    expect(formatProgress(1, 5)).toBe('1/5 systems (20%)');
  });

  it('returns "2/5 systems (40%)" with 2 installed', () => {
    expect(formatProgress(2, 5)).toBe('2/5 systems (40%)');
  });

  it('returns "3/5 systems (60%)" with 3 installed', () => {
    expect(formatProgress(3, 5)).toBe('3/5 systems (60%)');
  });

  it('returns "4/5 systems (80%)" with 4 installed', () => {
    expect(formatProgress(4, 5)).toBe('4/5 systems (80%)');
  });

  it('returns "5/5 systems (100%)" when all installed', () => {
    expect(formatProgress(5, 5)).toBe('5/5 systems (100%)');
  });

  it('rounds percentage to nearest integer for non-multiples of 5', () => {
    // Edge case: custom total (for reuse in other contexts)
    expect(formatProgress(1, 3)).toBe('1/3 systems (33%)');
    expect(formatProgress(2, 3)).toBe('2/3 systems (67%)');
  });

  it('returns "0/0 systems (0%)" when total is 0 (divide-by-zero guard)', () => {
    expect(formatProgress(0, 0)).toBe('0/0 systems (0%)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getIngredientZones
// ═══════════════════════════════════════════════════════════════════════════════

describe('getIngredientZones', () => {
  it('returns an array of zone names (strings) for a known ingredient', () => {
    const zones = getIngredientZones('Copper Wiring');
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
    // Copper Wiring is in default (all zones), toolbox (0-4), backpack (0-3)
    // So it should appear in all 5 zones
    for (const name of Object.values(ZONE_NAMES)) {
      expect(zones).toContain(name);
    }
  });

  it('returns zone names as strings matching ZONE_NAMES values', () => {
    const zones = getIngredientZones('Solenoid Valve');
    // Solenoid Valve is in default (all zones) and toolbox (all zones)
    expect(zones).toContain('Cypress Creek Preserve');
    expect(zones).toContain('US-41 Corridor');
  });

  it('returns an empty array for an unknown ingredient', () => {
    const zones = getIngredientZones('Nonexistent Widget');
    expect(zones).toEqual([]);
  });

  it('Hydraulic Seal is available in multiple zones (default + cooler + crate)', () => {
    const zones = getIngredientZones('Hydraulic Seal');
    expect(zones).toContain('Cypress Creek Preserve');
    expect(zones).toContain('US-41 Corridor');
    expect(zones).toContain('Collier Commons');
    // Cooler is not in Zone 3, but default and crate are
    expect(zones).toContain('Conner Preserve');
    expect(zones).toContain('LOLHS / SR-54');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildChecklist — core logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildChecklist', () => {
  // ─── Always returns all 5 systems ───────────────────────────────────────────

  it('always returns exactly 5 rows regardless of game state', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    expect(result).toHaveLength(5);
  });

  it('rows are ordered matching ROCKET_SYSTEMS sequence', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    expect(result[0].componentLabel).toBe('Fuel Injector');
    expect(result[1].componentLabel).toBe('Oxidizer Tank');
    expect(result[2].componentLabel).toBe('Avionics Board');
    expect(result[3].componentLabel).toBe('Battery Array');
    expect(result[4].componentLabel).toBe('Pressure Regulator');
  });

  it('each row has systemIndex, systemLabel, componentLabel, status, and ingredients', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    for (let i = 0; i < 5; i++) {
      const row = result[i];
      expect(row).toHaveProperty('systemIndex', i);
      expect(row).toHaveProperty('systemLabel');
      expect(row).toHaveProperty('componentLabel');
      expect(row).toHaveProperty('status');
      expect(row).toHaveProperty('ingredients');
      expect(row.ingredients).toHaveLength(2);
    }
  });

  // ─── Status: INSTALLED (green [X]) ──────────────────────────────────────────

  it('marks first N systems as INSTALLED when systemsInstalled = N', () => {
    const result = buildChecklist({ systemsInstalled: 2, inventory: [] });
    expect(result[0].status).toBe('installed');
    expect(result[1].status).toBe('installed');
    expect(result[2].status).toBe('needed');
  });

  it('installed system ingredients also show INSTALLED status', () => {
    const result = buildChecklist({ systemsInstalled: 1, inventory: [] });
    // System 0 is installed — its ingredients should also be marked installed
    expect(result[0].ingredients[0].status).toBe('installed');
    expect(result[0].ingredients[1].status).toBe('installed');
  });

  it('all 5 systems installed means every row is INSTALLED', () => {
    const result = buildChecklist({ systemsInstalled: 5, inventory: [] });
    for (const row of result) {
      expect(row.status).toBe('installed');
    }
  });

  // ─── Status: IN_INVENTORY (yellow [/]) ──────────────────────────────────────

  it('marks system as IN_INVENTORY when its component is in inventory', () => {
    const inventory = [
      { label: 'Avionics Board', type: 'component' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    // System index 2 = Avionics Board
    expect(result[2].status).toBe('in_inventory');
  });

  it('marks individual ingredient as IN_INVENTORY when it is in inventory', () => {
    const inventory = [
      { label: 'Solenoid Valve', type: 'ingredient' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    // System 0 (Fuel Injector) needs Solenoid Valve + Copper Wiring
    // One ingredient present → system still NEEDED, but that ingredient is IN_INVENTORY
    expect(result[0].status).toBe('needed');
    expect(result[0].ingredients[0].status).toBe('in_inventory');
    expect(result[0].ingredients[1].status).toBe('needed');
  });

  it('both ingredients in inventory but component not crafted → system is still NEEDED', () => {
    // Having both ingredients doesn't make the system IN_INVENTORY — only having the
    // crafted component does
    const inventory = [
      { label: 'Solenoid Valve', type: 'ingredient' },
      { label: 'Copper Wiring', type: 'ingredient' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    expect(result[0].status).toBe('needed');
    expect(result[0].ingredients[0].status).toBe('in_inventory');
    expect(result[0].ingredients[1].status).toBe('in_inventory');
  });

  // ─── Status: NEEDED (gray [ ]) ─────────────────────────────────────────────

  it('marks system and ingredients as NEEDED when nothing relevant is in inventory', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    expect(result[0].status).toBe('needed');
    expect(result[0].ingredients[0].status).toBe('needed');
    expect(result[0].ingredients[1].status).toBe('needed');
  });

  // ─── Zone hints for missing ingredients ─────────────────────────────────────

  it('each NEEDED ingredient includes non-empty zones array with zone names', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    for (const row of result) {
      for (const ing of row.ingredients) {
        if (ing.status === 'needed') {
          expect(Array.isArray(ing.zones)).toBe(true);
          expect(ing.zones.length).toBeGreaterThan(0);
          // All zone names should be from the known set
          for (const z of ing.zones) {
            expect(Object.values(ZONE_NAMES)).toContain(z);
          }
        }
      }
    }
  });

  it('IN_INVENTORY ingredients still include zones (for reference)', () => {
    const inventory = [
      { label: 'Solenoid Valve', type: 'ingredient' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    // Even though ingredient is found, zones are still populated for info
    expect(result[0].ingredients[0].zones.length).toBeGreaterThan(0);
  });

  it('INSTALLED system ingredients have empty zones array (no longer needed)', () => {
    const result = buildChecklist({ systemsInstalled: 1, inventory: [] });
    // System 0 is installed — its ingredients' zones should be empty
    expect(result[0].ingredients[0].zones).toEqual([]);
    expect(result[0].ingredients[1].zones).toEqual([]);
  });

  // ─── Partially-crafted state (mixed statuses) ──────────────────────────────

  it('handles a realistic mid-game state: 1 installed, 1 in inventory, 3 needed', () => {
    const inventory = [
      { label: 'Oxidizer Tank', type: 'component' },
      { label: 'Hydraulic Seal', type: 'ingredient' },
    ];
    const result = buildChecklist({ systemsInstalled: 1, inventory });

    // System 0 (Fuel Injector) — installed
    expect(result[0].status).toBe('installed');

    // System 1 (Oxidizer Tank) — component is in inventory
    expect(result[1].status).toBe('in_inventory');

    // System 2 (Avionics Board) — needed
    expect(result[2].status).toBe('needed');

    // System 3 (Battery Array) — needed
    expect(result[3].status).toBe('needed');

    // System 4 (Pressure Regulator) — needs Hydraulic Seal (in inv) + PVC Coupler (missing)
    expect(result[4].status).toBe('needed');
    expect(result[4].ingredients[0].status).toBe('in_inventory');  // Hydraulic Seal
    expect(result[4].ingredients[1].status).toBe('needed');         // PVC Coupler
  });

  it('handles 4 installed, 1 component in inventory (near-complete state)', () => {
    const inventory = [
      { label: 'Pressure Regulator', type: 'component' },
    ];
    const result = buildChecklist({ systemsInstalled: 4, inventory });

    // First 4 installed
    for (let i = 0; i < 4; i++) {
      expect(result[i].status).toBe('installed');
    }
    // Last one is in inventory (crafted, not yet installed)
    expect(result[4].status).toBe('in_inventory');
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  it('empty inventory and 0 installed → all 5 systems NEEDED', () => {
    const result = buildChecklist({ systemsInstalled: 0, inventory: [] });
    for (const row of result) {
      expect(row.status).toBe('needed');
    }
  });

  it('ignores junk items in inventory (only ingredients and components matter)', () => {
    const inventory = [
      { label: 'Empty', type: 'junk' },
      { label: 'Energy Drink', type: 'junk' },
      { label: 'Duct Tape', type: 'junk' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    for (const row of result) {
      expect(row.status).toBe('needed');
    }
  });

  it('duplicate ingredients in inventory do not double-count', () => {
    const inventory = [
      { label: 'Solenoid Valve', type: 'ingredient' },
      { label: 'Solenoid Valve', type: 'ingredient' },
    ];
    const result = buildChecklist({ systemsInstalled: 0, inventory });
    // Status should still be just 'in_inventory' for that ingredient, not something else
    expect(result[0].ingredients[0].status).toBe('in_inventory');
    expect(result[0].status).toBe('needed'); // still needs Copper Wiring
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT GUARD — LOOT_TABLE_INGREDIENTS vs searchable_container.js source
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LOOT_TABLE_INGREDIENTS drift guard (sync with searchable_container.js)', () => {
  // Read the source file as text — cannot import it (Phaser dependency)
  const sourcePath = resolve(__dirname, '../src/gameobjects/searchable_container.js');
  const sourceText = readFileSync(sourcePath, 'utf-8');

  // Extract all ingredient labels from source: entries with type: "ingredient"
  // Pattern matches lines like: { label: "Copper Wiring", ..., type: "ingredient" ... }
  const sourceIngredientLabels = new Set();
  const ingredientRegex = /\{\s*label:\s*"([^"]+)"[^}]*type:\s*"ingredient"/g;
  let match;
  while ((match = ingredientRegex.exec(sourceText)) !== null) {
    sourceIngredientLabels.add(match[1]);
  }

  // Flatten all labels from LOOT_TABLE_INGREDIENTS (checklist_logic.js)
  const checklistLabels = new Set();
  for (const [, labels] of Object.entries(LOOT_TABLE_INGREDIENTS)) {
    for (const label of labels) {
      checklistLabels.add(label);
    }
  }

  it('source file contains at least one ingredient (sanity check for regex)', () => {
    expect(sourceIngredientLabels.size).toBeGreaterThan(0);
  });

  it('every label in LOOT_TABLE_INGREDIENTS exists in searchable_container.js', () => {
    for (const label of checklistLabels) {
      expect(
        sourceIngredientLabels.has(label),
        `LOOT_TABLE_INGREDIENTS contains "${label}" but searchable_container.js does not — checklist_logic.js is out of sync`
      ).toBe(true);
    }
  });

  it('every ingredient in searchable_container.js exists in LOOT_TABLE_INGREDIENTS', () => {
    for (const label of sourceIngredientLabels) {
      expect(
        checklistLabels.has(label),
        `searchable_container.js contains ingredient "${label}" but LOOT_TABLE_INGREDIENTS does not — checklist_logic.js is out of sync`
      ).toBe(true);
    }
  });
});
