/**
 * Tests for src/gameobjects/pause_logic.js — Issue #99
 *
 * This module is a PURE-JS, Phaser-free logic layer powering the Pause Menu:
 *   - ESC pauses GameScene and the HUD timer
 *   - Pause overlay shows: current stats, system checklist, RESUME / SETTINGS / QUIT TO MENU
 *   - Flavour text: "Time paused. The hurricane waits for no one. But it will wait for you."
 *   - ESC or RESUME resumes gameplay
 *   - QUIT TO MENU returns to splash/menu
 *
 * Expected exports from src/gameobjects/pause_logic.js:
 *   PAUSE_FLAVOUR_TEXT  — string literal
 *   MENU_OPTIONS        — [{ id: string, label: string }] ordered array
 *   getNextSelection(current, direction, optionCount)  — number (wraps around)
 *   getOptionAction(optionId)  — string action id
 *   buildPauseStats(registryState)  — { timeFormatted, xp, hp, systemsInstalled, checklist }
 *
 * REUSE: buildPauseStats delegates to buildChecklist() from checklist_logic.js
 * for the system checklist — it does NOT duplicate recipe/status logic.
 */

import { describe, it, expect } from 'vitest';
import {
  PAUSE_FLAVOUR_TEXT,
  MENU_OPTIONS,
  getNextSelection,
  getOptionAction,
  buildPauseStats,
} from '../src/gameobjects/pause_logic.js';

// ─── Inlined from src/gameobjects/checklist_logic.js — keep in sync ───────────
// buildPauseStats must delegate to checklist_logic.buildChecklist internally.
// We verify it returns the correct checklist shape without reimplementing it.
import { buildChecklist } from '../src/gameobjects/checklist_logic.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1 — Flavour Text
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pause Menu — Flavour Text', () => {
  it('exports the exact flavour text string from the acceptance criteria', () => {
    expect(PAUSE_FLAVOUR_TEXT).toBe(
      'Time paused. The hurricane waits for no one. But it will wait for you.'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// § 2 — Menu Options
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pause Menu — Menu Options', () => {
  it('has exactly 3 menu options', () => {
    expect(MENU_OPTIONS).toHaveLength(3);
  });

  it('first option is RESUME with id "resume"', () => {
    expect(MENU_OPTIONS[0].id).toBe('resume');
    expect(MENU_OPTIONS[0].label).toBe('RESUME');
  });

  it('second option is SETTINGS with id "settings"', () => {
    expect(MENU_OPTIONS[1].id).toBe('settings');
    expect(MENU_OPTIONS[1].label).toBe('SETTINGS');
  });

  it('third option is QUIT TO MENU with id "quit"', () => {
    expect(MENU_OPTIONS[2].id).toBe('quit');
    expect(MENU_OPTIONS[2].label).toBe('QUIT TO MENU');
  });

  it('options are in the correct order: RESUME, SETTINGS, QUIT TO MENU', () => {
    const labels = MENU_OPTIONS.map(o => o.label);
    expect(labels).toEqual(['RESUME', 'SETTINGS', 'QUIT TO MENU']);
  });

  it('each option has a unique id', () => {
    const ids = MENU_OPTIONS.map(o => o.id);
    expect(new Set(ids).size).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// § 3 — Wrap-Around Navigation (getNextSelection)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pause Menu — getNextSelection (wrap-around navigation)', () => {
  const COUNT = 3; // 3 menu options

  it('moving down from index 0 gives index 1', () => {
    expect(getNextSelection(0, 1, COUNT)).toBe(1);
  });

  it('moving down from index 1 gives index 2', () => {
    expect(getNextSelection(1, 1, COUNT)).toBe(2);
  });

  it('moving down from last index wraps to first (2 -> 0)', () => {
    expect(getNextSelection(2, 1, COUNT)).toBe(0);
  });

  it('moving up from index 2 gives index 1', () => {
    expect(getNextSelection(2, -1, COUNT)).toBe(1);
  });

  it('moving up from index 1 gives index 0', () => {
    expect(getNextSelection(1, -1, COUNT)).toBe(0);
  });

  it('moving up from first index wraps to last (0 -> 2)', () => {
    expect(getNextSelection(0, -1, COUNT)).toBe(2);
  });

  it('works with different option counts (5 options, wrap down)', () => {
    expect(getNextSelection(4, 1, 5)).toBe(0);
  });

  it('works with different option counts (5 options, wrap up)', () => {
    expect(getNextSelection(0, -1, 5)).toBe(4);
  });

  it('stays in place if optionCount is 1', () => {
    expect(getNextSelection(0, 1, 1)).toBe(0);
    expect(getNextSelection(0, -1, 1)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// § 4 — Option Action Mapping (getOptionAction)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pause Menu — getOptionAction', () => {
  it('RESUME option triggers "resume" action', () => {
    expect(getOptionAction('resume')).toBe('resume');
  });

  it('SETTINGS option triggers "settings" action', () => {
    expect(getOptionAction('settings')).toBe('settings');
  });

  it('QUIT TO MENU option triggers "quit_to_menu" action', () => {
    expect(getOptionAction('quit')).toBe('quit_to_menu');
  });

  it('unknown option id returns null', () => {
    expect(getOptionAction('nonexistent')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// § 5 — buildPauseStats (stats formatting + checklist integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pause Menu — buildPauseStats', () => {
  it('formats time as mm:ss at 60 minutes (3600s -> "60:00")', () => {
    const stats = buildPauseStats({ timeLeft: 3600, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.timeFormatted).toBe('60:00');
  });

  it('formats time as mm:ss at 0 seconds (0s -> "00:00")', () => {
    const stats = buildPauseStats({ timeLeft: 0, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.timeFormatted).toBe('00:00');
  });

  it('formats time correctly at 9 minutes 5 seconds (545s -> "09:05")', () => {
    const stats = buildPauseStats({ timeLeft: 545, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.timeFormatted).toBe('09:05');
  });

  it('formats time correctly at boundary: 59 seconds (59s -> "00:59")', () => {
    const stats = buildPauseStats({ timeLeft: 59, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.timeFormatted).toBe('00:59');
  });

  it('formats time correctly at boundary: exactly 1 minute (60s -> "01:00")', () => {
    const stats = buildPauseStats({ timeLeft: 60, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.timeFormatted).toBe('01:00');
  });

  it('returns xp as-is from registry state', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 450, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.xp).toBe(450);
  });

  it('returns hp as-is from registry state', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 0, hp: 2, systemsInstalled: 0, inventory: [] });
    expect(stats.hp).toBe(2);
  });

  it('returns systemsInstalled count', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 0, hp: 3, systemsInstalled: 3, inventory: [] });
    expect(stats.systemsInstalled).toBe(3);
  });

  it('includes checklist from checklist_logic.buildChecklist (reuse, not duplicate)', () => {
    const registryState = {
      timeLeft: 2400,
      xp: 100,
      hp: 3,
      systemsInstalled: 2,
      inventory: [
        { label: 'Avionics Board', type: 'component' },
        { label: 'RC Transmitter', type: 'ingredient' },
      ],
    };
    const stats = buildPauseStats(registryState);

    // The checklist should be identical to what buildChecklist returns directly
    const expectedChecklist = buildChecklist({
      systemsInstalled: registryState.systemsInstalled,
      inventory: registryState.inventory,
    });
    expect(stats.checklist).toEqual(expectedChecklist);
  });

  it('checklist has exactly 5 rows (one per rocket system)', () => {
    const stats = buildPauseStats({ timeLeft: 1000, xp: 0, hp: 3, systemsInstalled: 0, inventory: [] });
    expect(stats.checklist).toHaveLength(5);
  });

  it('handles max XP gracefully', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 99999, hp: 3, systemsInstalled: 5, inventory: [] });
    expect(stats.xp).toBe(99999);
  });

  it('handles zero HP', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 0, hp: 0, systemsInstalled: 0, inventory: [] });
    expect(stats.hp).toBe(0);
  });

  it('handles all 5 systems installed', () => {
    const stats = buildPauseStats({ timeLeft: 100, xp: 500, hp: 3, systemsInstalled: 5, inventory: [] });
    expect(stats.systemsInstalled).toBe(5);
    // All 5 checklist rows should be "installed"
    for (const row of stats.checklist) {
      expect(row.status).toBe('installed');
    }
  });
});
