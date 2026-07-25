/**
 * Menu Logic Tests (Issue #115)
 *
 * Tests for the pure menu_logic.js module that will own:
 *   - MENU_OPTIONS: ordered array of { id, label, action } menu items
 *   - TITLE_COLOUR: the amber stencil font colour constant (hex number)
 *   - isOptionEnabled(id, { hasSave }): boolean predicate (CONTINUE disabled without save)
 *   - getNextSelection(current, direction, options): wrap-around navigation skipping disabled
 *   - buildLeaderboardRows(bests): format personal bests for display
 *
 * CONTINUE availability is gated by SaveManager.hasSave() from issue #98's
 * save_logic.js. The menu_logic module does NOT import SaveManager directly —
 * it receives { hasSave: boolean } context. The scene wires SaveManager.hasSave()
 * into that context at runtime.
 *
 * Scope boundary: issue #106 (leaderboard persistence) is NOT implemented yet.
 * buildLeaderboardRows must render gracefully from an empty/absent bests object,
 * showing placeholder dashes for missing data.
 *
 * No Phaser import — pure JS module.
 */

import { describe, it, expect } from 'vitest';
import {
  MENU_OPTIONS,
  TITLE_COLOUR,
  isOptionEnabled,
  getNextSelection,
  buildLeaderboardRows,
} from '../src/gameobjects/menu_logic.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Group 1 — Menu option order and structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('MENU_OPTIONS — ordered list', () => {
  it('contains exactly 4 options', () => {
    expect(MENU_OPTIONS).toHaveLength(4);
  });

  it('options are in order: NEW GAME, CONTINUE, LEADERBOARD, SETTINGS', () => {
    // inlined from src/gameobjects/menu_logic.js — keep in sync
    expect(MENU_OPTIONS[0].id).toBe('new_game');
    expect(MENU_OPTIONS[1].id).toBe('continue');
    expect(MENU_OPTIONS[2].id).toBe('leaderboard');
    expect(MENU_OPTIONS[3].id).toBe('settings');
  });

  it('each option has a human-readable label', () => {
    expect(MENU_OPTIONS[0].label).toBe('NEW GAME');
    expect(MENU_OPTIONS[1].label).toBe('CONTINUE');
    expect(MENU_OPTIONS[2].label).toBe('LEADERBOARD');
    expect(MENU_OPTIONS[3].label).toBe('SETTINGS');
  });

  it('each option has a unique action id matching its id', () => {
    // Action ids are used by the scene to dispatch behaviour
    expect(MENU_OPTIONS[0].action).toBe('new_game');
    expect(MENU_OPTIONS[1].action).toBe('continue');
    expect(MENU_OPTIONS[2].action).toBe('leaderboard');
    expect(MENU_OPTIONS[3].action).toBe('settings');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 2 — Title colour constant
// ═══════════════════════════════════════════════════════════════════════════════

describe('TITLE_COLOUR — amber stencil font', () => {
  it('is the correct amber hex value (0xFFBF00)', () => {
    // SPEC says amber — NOT the current green (0x4fffaa)
    // inlined from src/gameobjects/menu_logic.js — keep in sync
    expect(TITLE_COLOUR).toBe(0xFFBF00);
  });

  it('is a number (not a string)', () => {
    expect(typeof TITLE_COLOUR).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 3 — isOptionEnabled predicate
// ═══════════════════════════════════════════════════════════════════════════════

describe('isOptionEnabled — CONTINUE gate', () => {
  it('NEW GAME is always enabled regardless of save state', () => {
    expect(isOptionEnabled('new_game', { hasSave: false })).toBe(true);
    expect(isOptionEnabled('new_game', { hasSave: true })).toBe(true);
  });

  it('CONTINUE is disabled when hasSave is false', () => {
    expect(isOptionEnabled('continue', { hasSave: false })).toBe(false);
  });

  it('CONTINUE is enabled when hasSave is true', () => {
    expect(isOptionEnabled('continue', { hasSave: true })).toBe(true);
  });

  it('LEADERBOARD is always enabled', () => {
    expect(isOptionEnabled('leaderboard', { hasSave: false })).toBe(true);
    expect(isOptionEnabled('leaderboard', { hasSave: true })).toBe(true);
  });

  it('SETTINGS is always enabled', () => {
    expect(isOptionEnabled('settings', { hasSave: false })).toBe(true);
    expect(isOptionEnabled('settings', { hasSave: true })).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 4 — getNextSelection navigation (wrap-around, skip disabled)
// ═══════════════════════════════════════════════════════════════════════════════

describe('getNextSelection — keyboard navigation', () => {
  // Helper: build the enabled options array based on hasSave context
  function enabledOptions(hasSave) {
    return MENU_OPTIONS.map(opt => ({
      ...opt,
      enabled: isOptionEnabled(opt.id, { hasSave }),
    }));
  }

  describe('with save present (all options enabled)', () => {
    it('moves down from NEW GAME to CONTINUE', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('new_game', 'down', opts)).toBe('continue');
    });

    it('moves down from CONTINUE to LEADERBOARD', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('continue', 'down', opts)).toBe('leaderboard');
    });

    it('moves down from LEADERBOARD to SETTINGS', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('leaderboard', 'down', opts)).toBe('settings');
    });

    it('wraps from SETTINGS down to NEW GAME', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('settings', 'down', opts)).toBe('new_game');
    });

    it('moves up from CONTINUE to NEW GAME', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('continue', 'up', opts)).toBe('new_game');
    });

    it('wraps from NEW GAME up to SETTINGS', () => {
      const opts = enabledOptions(true);
      expect(getNextSelection('new_game', 'up', opts)).toBe('settings');
    });
  });

  describe('without save (CONTINUE disabled — must be skipped)', () => {
    it('moves down from NEW GAME, skips disabled CONTINUE, lands on LEADERBOARD', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('new_game', 'down', opts)).toBe('leaderboard');
    });

    it('moves up from LEADERBOARD, skips disabled CONTINUE, lands on NEW GAME', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('leaderboard', 'up', opts)).toBe('new_game');
    });

    it('wraps down from SETTINGS to NEW GAME (CONTINUE still skipped)', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('settings', 'down', opts)).toBe('new_game');
    });

    it('wraps up from NEW GAME to SETTINGS (CONTINUE still skipped)', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('new_game', 'up', opts)).toBe('settings');
    });

    it('moves down from LEADERBOARD to SETTINGS', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('leaderboard', 'down', opts)).toBe('settings');
    });

    it('moves up from SETTINGS to LEADERBOARD', () => {
      const opts = enabledOptions(false);
      expect(getNextSelection('settings', 'up', opts)).toBe('leaderboard');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 5 — buildLeaderboardRows formatter
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildLeaderboardRows — personal bests display', () => {
  it('formats populated bests into labelled rows', () => {
    const bests = {
      bestTime: 142,       // seconds remaining at launch
      bestXP: 3200,
      bestCombo: 8,
      gamesPlayed: 5,
    };
    const rows = buildLeaderboardRows(bests);

    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // Each row is { label: string, value: string }
    const timeRow = rows.find(r => r.label.includes('TIME'));
    expect(timeRow).toBeDefined();
    expect(timeRow.value).toBe('2:22');  // 142 seconds = 2m 22s

    const xpRow = rows.find(r => r.label.includes('XP'));
    expect(xpRow).toBeDefined();
    expect(xpRow.value).toBe('3200');

    const comboRow = rows.find(r => r.label.includes('COMBO'));
    expect(comboRow).toBeDefined();
    expect(comboRow.value).toBe('8');

    const gamesRow = rows.find(r => r.label.includes('GAMES'));
    expect(gamesRow).toBeDefined();
    expect(gamesRow.value).toBe('5');
  });

  it('returns placeholder dashes for null/undefined bests', () => {
    const rows = buildLeaderboardRows(null);

    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // All values should be dashes when no data exists
    rows.forEach(row => {
      expect(row.value).toBe('--');
    });
  });

  it('returns placeholder dashes for empty bests object', () => {
    const rows = buildLeaderboardRows({});

    expect(rows).toBeInstanceOf(Array);
    rows.forEach(row => {
      expect(row.value).toBe('--');
    });
  });

  it('handles partial bests (some fields missing)', () => {
    const bests = { bestXP: 1500 };  // only XP present
    const rows = buildLeaderboardRows(bests);

    const xpRow = rows.find(r => r.label.includes('XP'));
    expect(xpRow.value).toBe('1500');

    const timeRow = rows.find(r => r.label.includes('TIME'));
    expect(timeRow.value).toBe('--');
  });

  it('formats time as M:SS (zero-padded seconds)', () => {
    const bests = { bestTime: 65 };  // 1m 05s
    const rows = buildLeaderboardRows(bests);
    const timeRow = rows.find(r => r.label.includes('TIME'));
    expect(timeRow.value).toBe('1:05');
  });

  it('formats time of exactly 0 seconds as 0:00', () => {
    const bests = { bestTime: 0 };
    const rows = buildLeaderboardRows(bests);
    const timeRow = rows.find(r => r.label.includes('TIME'));
    expect(timeRow.value).toBe('0:00');
  });
});
