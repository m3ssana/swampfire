/**
 * Splash (Menu) Scene — Issue #115
 *
 * Replaces the original splash.js in-place (same scene key "splash", same
 * position in the scene array). The boot flow is:
 *   Bootloader → Splash (this menu) → Transition → Game + HUD → Outro
 *
 * Features:
 *   - Animated background: cypress trees with rain + distant lightning
 *   - Keyboard navigation (up/down + enter) with visible highlight
 *   - CONTINUE greyed out when no save exists (navigation skips it)
 *   - NEW GAME clears save and starts fresh via transition scene
 *   - CONTINUE calls SaveManager.loadInto(scene) to resume
 *   - LEADERBOARD panel with placeholder dashes
 *   - SETTINGS panel with volume slider + control hints
 *   - Title in glowing amber (0xFFBF00 per SPEC)
 *   - Reuses lightning_logic.js for bolt geometry (no new lightning code)
 *   - Cleans up all tweens, emitters, key handlers on shutdown
 */

import SaveManager from '../gameobjects/save_manager.js';
import {
  MENU_OPTIONS,
  TITLE_COLOUR,
  isOptionEnabled,
  getNextSelection,
  buildLeaderboardRows,
} from '../gameobjects/menu_logic.js';
import {
  generateBoltPoints,
  pickInterval,
} from '../gameobjects/lightning_logic.js';

export default class Splash extends Phaser.Scene {
  constructor() {
    super({ key: "splash" });
  }

  create() {
    this.width = this.sys.game.config.width;
    this.height = this.sys.game.config.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2;

    this._hasSave = SaveManager.hasSave();
    this._selected = 'new_game';
    this._menuTexts = [];
    this._highlight = null;
    this._panel = null; // current sub-panel ('leaderboard' | 'settings' | null)
    this._panelObjects = [];
    this._lightningTimer = null;
    this._rainEmitter = null;

    this.cameras.main.setBackgroundColor(0x0a1a0a);

    this._drawBackground();
    this._startRain();
    this._startLightning();
    this._showTitle();
    this._showMenu();
    this._bindKeys();
    this._playMusic();

    // Cleanup on scene shutdown
    this.events.once('shutdown', this._cleanup, this);
  }

  // ─── Animated background ─────────────────────────────────────────────────────

  _drawBackground() {
    // Dark swamp ground
    this.add.rectangle(this.cx, this.height - 60, this.width, 120, 0x1a2e1a);

    // Cypress tree silhouettes (cheap: filled rectangles + triangles via graphics)
    const g = this.add.graphics();
    g.setDepth(1);

    const treePositions = [80, 200, 350, 520, 700, 850, 1000, 1150];
    treePositions.forEach((tx) => {
      const h = Phaser.Math.Between(180, 320);
      const baseY = this.height - 60;
      // Trunk
      g.fillStyle(0x1a3020, 1);
      g.fillRect(tx - 4, baseY - h, 8, h);
      // Canopy (triangle)
      g.fillStyle(0x0d2010, 0.8);
      g.fillTriangle(tx, baseY - h - 60, tx - 40, baseY - h + 20, tx + 40, baseY - h + 20);
      // Wider lower canopy
      g.fillTriangle(tx, baseY - h - 20, tx - 55, baseY - h + 50, tx + 55, baseY - h + 50);
    });

    // Swamp water reflection line
    g.fillStyle(0x0a3020, 0.4);
    g.fillRect(0, this.height - 30, this.width, 30);
  }

  _startRain() {
    // Cap at 80 particles for menu (cheap, atmospheric)
    this._rainEmitter = this.add.particles(0, 0, 'rain-drop', {
      x: { min: 0, max: this.width },
      y: -10,
      lifespan: 1200,
      speedY: { min: 200, max: 400 },
      speedX: { min: -20, max: -40 },
      alpha: { start: 0.4, end: 0.1 },
      scale: { start: 1, end: 0.5 },
      quantity: 2,
      frequency: 50,
      maxParticles: 80,
    });
    this._rainEmitter.setDepth(5);
  }

  _startLightning() {
    // Use Phase 3 interval (10-20s) for menu ambience
    this._scheduleLightning();
  }

  _scheduleLightning() {
    const interval = pickInterval(3); // 10000-20000ms
    if (!interval) return;

    this._lightningTimer = this.time.delayedCall(interval, () => {
      this._fireLightning();
      this._scheduleLightning();
    });
  }

  _fireLightning() {
    // Camera flash (brief white)
    this.cameras.main.flash(80, 200, 200, 255);

    // Render bolt using lightning_logic geometry
    const boltX = Phaser.Math.Between(50, this.width - 50);
    const points = generateBoltPoints(boltX, 0, this.height * 0.7, 8, 40);

    const g = this.add.graphics();
    g.setDepth(10);
    g.setScrollFactor(0);

    // Glow layer
    g.lineStyle(6, 0xbbddff, 0.25);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.strokePath();

    // Core layer
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.strokePath();

    // Fade and destroy
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 150,
      onComplete: () => { if (g?.active) g.destroy(); },
    });
  }

  // ─── Title ───────────────────────────────────────────────────────────────────

  _showTitle() {
    // Shadow layer (drifts for pulse effect)
    this._titleShadow1 = this.add
      .bitmapText(this.cx, 90, "default", "SWAMPFIRE", 72)
      .setTint(0x664400)
      .setOrigin(0.5)
      .setDepth(20);
    this._titleShadow2 = this.add
      .bitmapText(this.cx, 170, "default", "PROTOCOL", 72)
      .setTint(0x664400)
      .setOrigin(0.5)
      .setDepth(20);

    // Dark body layer
    this.add
      .bitmapText(this.cx, 90, "default", "SWAMPFIRE", 72)
      .setTint(0x332200)
      .setOrigin(0.5)
      .setDepth(21);
    this.add
      .bitmapText(this.cx, 170, "default", "PROTOCOL", 72)
      .setTint(0x332200)
      .setOrigin(0.5)
      .setDepth(21);

    // Bright highlight layer — AMBER per SPEC
    this.add
      .bitmapText(this.cx, 90, "default", "SWAMPFIRE", 74)
      .setTint(TITLE_COLOUR)
      .setOrigin(0.5)
      .setDepth(22);
    this.add
      .bitmapText(this.cx, 170, "default", "PROTOCOL", 74)
      .setTint(TITLE_COLOUR)
      .setOrigin(0.5)
      .setDepth(22);

    // Shadow drift animation
    this.tweens.add({
      targets: [this._titleShadow1, this._titleShadow2],
      x: '+=6',
      y: '+=6',
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  // ─── Menu ────────────────────────────────────────────────────────────────────

  _showMenu() {
    const startY = 300;
    const spacing = 48;

    // Selection highlight bar
    this._highlight = this.add
      .rectangle(this.cx, startY, 320, 38, TITLE_COLOUR, 0.15)
      .setDepth(29);

    this._menuTexts = [];

    MENU_OPTIONS.forEach((opt, i) => {
      const enabled = isOptionEnabled(opt.id, { hasSave: this._hasSave });
      const tint = enabled ? 0xffffff : 0x555555;
      const text = this.add
        .bitmapText(this.cx, startY + i * spacing, "default", opt.label, 28)
        .setTint(tint)
        .setOrigin(0.5)
        .setDepth(30);
      this._menuTexts.push({ id: opt.id, text, enabled });
    });

    this._updateHighlight();
  }

  _updateHighlight() {
    const idx = MENU_OPTIONS.findIndex(o => o.id === this._selected);
    const startY = 300;
    const spacing = 48;
    if (this._highlight) {
      this._highlight.setY(startY + idx * spacing);
    }
  }

  _getEnabledOptions() {
    return MENU_OPTIONS.map(opt => ({
      ...opt,
      enabled: isOptionEnabled(opt.id, { hasSave: this._hasSave }),
    }));
  }

  // ─── Key bindings ────────────────────────────────────────────────────────────

  _bindKeys() {
    this._onKeyDown = this.input.keyboard.on('keydown', this._handleKey, this);
  }

  _handleKey(event) {
    if (this._panel) {
      // In sub-panel: ESC or BACKSPACE returns to menu
      if (event.code === 'Escape' || event.code === 'Backspace') {
        this._closePanel();
      }
      return;
    }

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this._selected = getNextSelection(this._selected, 'up', this._getEnabledOptions());
        this._updateHighlight();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this._selected = getNextSelection(this._selected, 'down', this._getEnabledOptions());
        this._updateHighlight();
        break;
      case 'Enter':
      case 'Space':
        this._activateOption(this._selected);
        break;
    }
  }

  // ─── Option actions ──────────────────────────────────────────────────────────

  _activateOption(id) {
    switch (id) {
      case 'new_game':
        SaveManager.clearSave();
        if (this._theme) this._theme.stop();
        this.scene.start('transition');
        break;
      case 'continue':
        if (!this._hasSave) return;
        if (this._theme) this._theme.stop();
        this._loadSavedGame();
        break;
      case 'leaderboard':
        this._showLeaderboard();
        break;
      case 'settings':
        this._showSettings();
        break;
    }
  }

  _loadSavedGame() {
    // Load saved state into registry and get zone/position info
    const state = SaveManager.loadInto(this);
    if (!state) {
      // Fallback — save was invalid, start fresh
      this.scene.start('transition');
      return;
    }

    // Start game at the saved zone with saved position
    this.scene.start('game', {
      name: `ZONE ${state.zone}`,
      number: state.zone,
      loadedFromSave: true,
      savedPosition: state.position,
    });
  }

  // ─── Leaderboard panel ───────────────────────────────────────────────────────

  _showLeaderboard() {
    this._panel = 'leaderboard';
    this._hideMenu();

    // Panel background
    const bg = this.add.rectangle(this.cx, this.cy, 500, 400, 0x0a0a0a, 0.92)
      .setDepth(40);
    this._panelObjects.push(bg);

    const border = this.add.rectangle(this.cx, this.cy, 500, 400)
      .setStrokeStyle(2, TITLE_COLOUR)
      .setDepth(40);
    this._panelObjects.push(border);

    // Title
    const title = this.add
      .bitmapText(this.cx, this.cy - 160, "default", "LEADERBOARD", 32)
      .setTint(TITLE_COLOUR)
      .setOrigin(0.5)
      .setDepth(41);
    this._panelObjects.push(title);

    // Personal bests (placeholder dashes — #106 not implemented)
    const rows = buildLeaderboardRows(null);
    rows.forEach((row, i) => {
      const y = this.cy - 80 + i * 50;
      const label = this.add
        .bitmapText(this.cx - 120, y, "default", row.label, 20)
        .setTint(0xaaaaaa)
        .setOrigin(0, 0.5)
        .setDepth(41);
      const value = this.add
        .bitmapText(this.cx + 120, y, "default", row.value, 24)
        .setTint(0xffffff)
        .setOrigin(1, 0.5)
        .setDepth(41);
      this._panelObjects.push(label, value);
    });

    // Back hint
    const back = this.add
      .bitmapText(this.cx, this.cy + 170, "default", "ESC — BACK", 18)
      .setTint(0x888888)
      .setOrigin(0.5)
      .setDepth(41);
    this._panelObjects.push(back);
  }

  // ─── Settings panel ──────────────────────────────────────────────────────────

  _showSettings() {
    this._panel = 'settings';
    this._hideMenu();

    // Panel background
    const bg = this.add.rectangle(this.cx, this.cy, 500, 420, 0x0a0a0a, 0.92)
      .setDepth(40);
    this._panelObjects.push(bg);

    const border = this.add.rectangle(this.cx, this.cy, 500, 420)
      .setStrokeStyle(2, TITLE_COLOUR)
      .setDepth(40);
    this._panelObjects.push(border);

    // Title
    const title = this.add
      .bitmapText(this.cx, this.cy - 180, "default", "SETTINGS", 32)
      .setTint(TITLE_COLOUR)
      .setOrigin(0.5)
      .setDepth(41);
    this._panelObjects.push(title);

    // Volume control
    const volLabel = this.add
      .bitmapText(this.cx - 140, this.cy - 110, "default", "VOLUME", 22)
      .setTint(0xffffff)
      .setOrigin(0, 0.5)
      .setDepth(41);
    this._panelObjects.push(volLabel);

    // Volume bar background
    const volBg = this.add.rectangle(this.cx + 40, this.cy - 110, 200, 16, 0x333333)
      .setDepth(41);
    this._panelObjects.push(volBg);

    // Volume bar fill (current volume)
    const currentVol = this.sound.volume;
    const volFill = this.add.rectangle(
      this.cx + 40 - 100 + (currentVol * 200) / 2,
      this.cy - 110,
      currentVol * 200,
      12,
      TITLE_COLOUR
    ).setDepth(42);
    this._panelObjects.push(volFill);

    const volValue = this.add
      .bitmapText(this.cx + 160, this.cy - 110, "default", `${Math.round(currentVol * 100)}%`, 18)
      .setTint(0xaaaaaa)
      .setOrigin(0, 0.5)
      .setDepth(41);
    this._panelObjects.push(volValue);

    // Control hints
    const controls = [
      { key: 'WASD', desc: 'Move' },
      { key: 'SHIFT', desc: 'Sprint (unlimited)' },
      { key: 'E', desc: 'Interact' },
      { key: 'UP/DOWN', desc: 'Menu navigation' },
      { key: 'ENTER', desc: 'Select' },
      { key: 'ESC', desc: 'Back' },
    ];

    const controlTitle = this.add
      .bitmapText(this.cx, this.cy - 50, "default", "CONTROLS", 22)
      .setTint(TITLE_COLOUR)
      .setOrigin(0.5)
      .setDepth(41);
    this._panelObjects.push(controlTitle);

    controls.forEach((ctrl, i) => {
      const y = this.cy - 10 + i * 34;
      const keyText = this.add
        .bitmapText(this.cx - 120, y, "default", ctrl.key, 18)
        .setTint(0xffffff)
        .setOrigin(0, 0.5)
        .setDepth(41);
      const descText = this.add
        .bitmapText(this.cx + 20, y, "default", ctrl.desc, 18)
        .setTint(0x888888)
        .setOrigin(0, 0.5)
        .setDepth(41);
      this._panelObjects.push(keyText, descText);
    });

    // Back hint
    const back = this.add
      .bitmapText(this.cx, this.cy + 190, "default", "ESC — BACK", 18)
      .setTint(0x888888)
      .setOrigin(0.5)
      .setDepth(41);
    this._panelObjects.push(back);
  }

  // ─── Panel management ────────────────────────────────────────────────────────

  _hideMenu() {
    this._menuTexts.forEach(item => item.text.setVisible(false));
    if (this._highlight) this._highlight.setVisible(false);
  }

  _showMenuItems() {
    this._menuTexts.forEach(item => item.text.setVisible(true));
    if (this._highlight) this._highlight.setVisible(true);
  }

  _closePanel() {
    this._panelObjects.forEach(obj => { if (obj?.active) obj.destroy(); });
    this._panelObjects = [];
    this._panel = null;
    this._showMenuItems();
  }

  // ─── Music ───────────────────────────────────────────────────────────────────

  _playMusic() {
    try {
      this._theme = this.sound.add("menu_theme");
      this._theme.play({
        mute: false,
        volume: 0.3,
        rate: 1,
        detune: 0,
        seek: 0,
        loop: true,
        delay: 0,
      });
    } catch {
      // Graceful no-op if audio not available
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  _cleanup() {
    // Stop music
    if (this._theme) {
      this._theme.stop();
      this._theme = null;
    }

    // Remove lightning timer
    if (this._lightningTimer) {
      this._lightningTimer.remove();
      this._lightningTimer = null;
    }

    // Stop rain emitter
    if (this._rainEmitter) {
      this._rainEmitter.stop();
      this._rainEmitter = null;
    }

    // Remove keyboard listener
    this.input.keyboard.off('keydown', this._handleKey, this);

    // Destroy panel objects
    this._panelObjects.forEach(obj => { if (obj?.active) obj.destroy(); });
    this._panelObjects = [];
  }
}
