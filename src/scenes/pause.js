/**
 * PauseScene — Issue #99
 *
 * Launched via `scene.launch('pause')` from GameScene on ESC press.
 * Runs in parallel above GameScene + HUDScene. Pauses the HUD timer and
 * renders a full-screen overlay with:
 *   - Current stats (time, XP, HP, systems installed)
 *   - System checklist (delegated to checklist_logic.js via buildPauseStats)
 *   - Flavour text
 *   - Menu options: RESUME / SETTINGS / QUIT TO MENU with keyboard navigation
 *
 * Timer pause mechanism:
 *   HUD's countdown is owned by `this.time.addEvent(...)` which is tied to
 *   Phaser's scene clock. We pause the HUD scene (`scene.pause('hud')`) which
 *   freezes its Time manager — the countdown simply stops ticking. On resume
 *   we call `scene.resume('hud')` and the timer continues from exactly where
 *   it left off — no seconds lost or skipped.
 *
 * SETTINGS panel is a placeholder — clearly labelled "Coming Soon".
 */

import {
  PAUSE_FLAVOUR_TEXT,
  MENU_OPTIONS,
  getNextSelection,
  getOptionAction,
  buildPauseStats,
} from '../gameobjects/pause_logic.js';
import {
  STATUS_SYMBOLS,
  STATUS_COLORS,
} from '../gameobjects/checklist_logic.js';

const HIGHLIGHT_TINT = 0x4fffaa;   // Swampfire cyan — selected option
const NORMAL_TINT    = 0xaaaaaa;   // Dim grey — unselected options
const PANEL_ALPHA    = 0.88;

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'pause' });
  }

  create() {
    this.w = this.sys.game.config.width;
    this.h = this.sys.game.config.height;

    // ── Guard flag — prevents rapid ESC double-trigger ─────────────────────
    this._processing = false;

    // ── Selection state ────────────────────────────────────────────────────
    this._selectedIndex = 0;

    // ── Settings panel state ───────────────────────────────────────────────
    this._settingsOpen = false;
    this._settingsElements = [];

    // ── Build overlay ──────────────────────────────────────────────────────
    this._buildBackground();
    this._buildStats();
    this._buildChecklist();
    this._buildFlavourText();
    this._buildMenuOptions();
    this._highlightSelection();

    // ── Input ──────────────────────────────────────────────────────────────
    this._escKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC, true, true
    );
    this._escKey.on('down', this._onEsc, this);

    this._upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this._upKey.on('down', this._onUp, this);

    this._downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this._downKey.on('down', this._onDown, this);

    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._enterKey.on('down', this._onConfirm, this);

    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this._eKey.on('down', this._onConfirm, this);

    // W/S as alternate nav (since WASD are the movement keys)
    this._wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this._wKey.on('down', this._onUp, this);

    this._sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this._sKey.on('down', this._onDown, this);

    // ── Cleanup ────────────────────────────────────────────────────────────
    this.events.once('shutdown', this._cleanup, this);
  }

  // ─── Background ──────────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x000000)
      .setAlpha(PANEL_ALPHA)
      .setScrollFactor(0)
      .setDepth(200);
  }

  // ─── Stats block ────────────────────────────────────────────────────────

  _buildStats() {
    const registry = this.registry;
    const state = {
      timeLeft:         registry.get('timeLeft') ?? 3600,
      xp:              registry.get('xp') ?? 0,
      hp:              registry.get('hp') ?? 3,
      systemsInstalled: registry.get('systemsInstalled') ?? 0,
      inventory:       registry.get('inventory') ?? [],
    };
    const stats = buildPauseStats(state);

    const leftX = 80;
    const topY  = 60;

    // Time
    this._timeText = this.add
      .bitmapText(leftX, topY, 'default', `TIME: ${stats.timeFormatted}`, 18)
      .setTint(0xffee44)
      .setScrollFactor(0)
      .setDepth(201);

    // XP
    this._xpText = this.add
      .bitmapText(leftX + 260, topY, 'default', `XP: ${stats.xp}`, 18)
      .setTint(0xffdd00)
      .setScrollFactor(0)
      .setDepth(201);

    // HP
    this._hpText = this.add
      .bitmapText(leftX + 480, topY, 'default', `HP: ${stats.hp}`, 18)
      .setTint(0xdd2222)
      .setScrollFactor(0)
      .setDepth(201);

    // Systems
    this.add
      .bitmapText(leftX + 660, topY, 'default', `SYSTEMS: ${stats.systemsInstalled}/5`, 18)
      .setTint(stats.systemsInstalled >= 5 ? 0x4fffaa : 0xff44aa)
      .setScrollFactor(0)
      .setDepth(201);
  }

  // ─── Checklist ───────────────────────────────────────────────────────────

  _buildChecklist() {
    const registry = this.registry;
    const state = {
      systemsInstalled: registry.get('systemsInstalled') ?? 0,
      inventory:       registry.get('inventory') ?? [],
    };
    const stats = buildPauseStats({
      timeLeft: registry.get('timeLeft') ?? 3600,
      xp: registry.get('xp') ?? 0,
      hp: registry.get('hp') ?? 3,
      ...state,
    });

    const TINT_MAP = { green: 0x44ff88, yellow: 0xffdd00, gray: 0x888888 };
    const startY = 110;
    const leftX  = 80;
    const rowH   = 36;

    // Expose for E2E test: _checklistElements
    this._checklistElements = [];

    for (let i = 0; i < stats.checklist.length; i++) {
      const row = stats.checklist[i];
      const y = startY + i * rowH;
      const statusKey = row.status === 'installed' ? 'INSTALLED'
        : row.status === 'in_inventory' ? 'IN_INVENTORY' : 'NEEDED';
      const symbol = STATUS_SYMBOLS[statusKey];
      const tint = TINT_MAP[STATUS_COLORS[statusKey]];

      const sysStr = `${symbol} ${row.systemLabel} — ${row.componentLabel}`;
      const sysText = this.add.bitmapText(leftX, y, 'default', sysStr, 14)
        .setTint(tint)
        .setScrollFactor(0)
        .setDepth(201);
      this._checklistElements.push(sysText);

      // Ingredient sub-rows
      for (let j = 0; j < row.ingredients.length; j++) {
        const ing = row.ingredients[j];
        const ingStatusKey = ing.status === 'installed' ? 'INSTALLED'
          : ing.status === 'in_inventory' ? 'IN_INVENTORY' : 'NEEDED';
        const ingSymbol = STATUS_SYMBOLS[ingStatusKey];
        const ingTint = TINT_MAP[STATUS_COLORS[ingStatusKey]];

        let ingStr = `  ${ingSymbol} ${ing.label}`;
        if (ing.status === 'needed' && ing.zones.length > 0) {
          ingStr += ` (${ing.zones.join(', ')})`;
        }

        const ingText = this.add.bitmapText(leftX + 20, y + 16 + j * 14, 'default', ingStr, 10)
          .setTint(ingTint)
          .setScrollFactor(0)
          .setDepth(201);
        this._checklistElements.push(ingText);
      }
    }
  }

  // ─── Flavour text ────────────────────────────────────────────────────────

  _buildFlavourText() {
    this._flavourText = this.add
      .bitmapText(this.w / 2, this.h - 100, 'default', PAUSE_FLAVOUR_TEXT, 14)
      .setOrigin(0.5)
      .setTint(0x666666)
      .setScrollFactor(0)
      .setDepth(201);

    // Expose as a plain string for E2E fallback access
    this.flavourText = PAUSE_FLAVOUR_TEXT;
  }

  // ─── Menu options ────────────────────────────────────────────────────────

  _buildMenuOptions() {
    this._menuTexts = [];
    // Expose labels array for E2E test
    this._menuOptionLabels = MENU_OPTIONS.map(o => o.label);

    const startY = this.h - 240;
    const cx = this.w / 2;
    const gap = 50;

    for (let i = 0; i < MENU_OPTIONS.length; i++) {
      const opt = MENU_OPTIONS[i];
      const text = this.add
        .bitmapText(cx, startY + i * gap, 'default', opt.label, 22)
        .setOrigin(0.5)
        .setTint(NORMAL_TINT)
        .setScrollFactor(0)
        .setDepth(202);
      this._menuTexts.push(text);
    }
  }

  _highlightSelection() {
    for (let i = 0; i < this._menuTexts.length; i++) {
      const selected = (i === this._selectedIndex);
      this._menuTexts[i].setTint(selected ? HIGHLIGHT_TINT : NORMAL_TINT);
      this._menuTexts[i].setScale(selected ? 1.15 : 1.0);
    }
  }

  // ─── Input handlers ──────────────────────────────────────────────────────

  _onEsc() {
    if (this._processing) return;
    if (this._settingsOpen) {
      this._closeSettings();
      return;
    }
    this._resume();
  }

  _onUp() {
    if (this._settingsOpen) return;
    this._selectedIndex = getNextSelection(
      this._selectedIndex, -1, MENU_OPTIONS.length
    );
    this._highlightSelection();
  }

  _onDown() {
    if (this._settingsOpen) return;
    this._selectedIndex = getNextSelection(
      this._selectedIndex, 1, MENU_OPTIONS.length
    );
    this._highlightSelection();
  }

  _onConfirm() {
    if (this._processing) return;
    if (this._settingsOpen) {
      this._closeSettings();
      return;
    }

    const option = MENU_OPTIONS[this._selectedIndex];
    const action = getOptionAction(option.id);

    switch (action) {
      case 'resume':
        this._resume();
        break;
      case 'settings':
        this._openSettings();
        break;
      case 'quit_to_menu':
        this._quitToMenu();
        break;
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  _resume() {
    this._processing = true;
    // Resume HUD timer
    this.scene.resume('hud');
    // Resume game scene
    this.scene.resume('game');
    // Stop (destroy) this pause overlay scene
    this.scene.stop('pause');
  }

  _quitToMenu() {
    this._processing = true;

    // Attempt to save progress before discarding the session.
    // save_manager.js lives on PR #144 and does NOT exist in this worktree.
    // We reach it defensively through the Game scene instance so this is a
    // harmless no-op here and starts working automatically once #144 merges.
    try {
      this.scene.get('game')?.saveManager?.save?.('quit');
    } catch (_) { /* no-op if save system is absent */ }

    // Stop HUD and game scenes cleanly
    this.scene.stop('hud');
    this.scene.stop('game');
    // Stop ourselves
    this.scene.stop('pause');
    // Start splash
    this.scene.start('splash');
  }

  _openSettings() {
    this._settingsOpen = true;
    this._destroySettingsElements();

    const cx = this.w / 2;
    const cy = this.h / 2;
    const pw = 500;
    const ph = 300;

    // Panel background
    const bg = this.add.rectangle(cx, cy, pw, ph, 0x111111)
      .setAlpha(0.95)
      .setDepth(210)
      .setScrollFactor(0);
    this._settingsElements.push(bg);

    // Border
    const border = this.add.graphics().setDepth(211).setScrollFactor(0);
    border.lineStyle(2, 0x4fffaa, 0.7);
    border.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
    this._settingsElements.push(border);

    // Title
    const title = this.add.bitmapText(cx, cy - 80, 'default', 'SETTINGS', 22)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setDepth(211)
      .setScrollFactor(0);
    this._settingsElements.push(title);

    // Placeholder text
    const placeholder = this.add.bitmapText(cx, cy, 'default', 'Coming Soon', 18)
      .setOrigin(0.5)
      .setTint(0x888888)
      .setDepth(211)
      .setScrollFactor(0);
    this._settingsElements.push(placeholder);

    // Hint to close
    const hint = this.add.bitmapText(cx, cy + 80, 'default', 'Press ESC or ENTER to close', 12)
      .setOrigin(0.5)
      .setTint(0x666666)
      .setDepth(211)
      .setScrollFactor(0);
    this._settingsElements.push(hint);
  }

  _closeSettings() {
    this._settingsOpen = false;
    this._destroySettingsElements();
  }

  _destroySettingsElements() {
    for (const el of this._settingsElements) {
      if (el?.active) el.destroy();
    }
    this._settingsElements = [];
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  _cleanup() {
    this._escKey?.off('down', this._onEsc, this);
    this._upKey?.off('down', this._onUp, this);
    this._downKey?.off('down', this._onDown, this);
    this._enterKey?.off('down', this._onConfirm, this);
    this._eKey?.off('down', this._onConfirm, this);
    this._wKey?.off('down', this._onUp, this);
    this._sKey?.off('down', this._onDown, this);
    this._destroySettingsElements();
  }
}
