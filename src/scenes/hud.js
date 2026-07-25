/**
 * HUDScene
 *
 * Runs in parallel on top of GameScene via `scene.launch("hud")`.
 * Owns the real-time countdown timer — decrements registry.timeLeft every
 * second and emits registry.timerExpired when it hits zero.
 *
 * Listens to Phaser's global registry for state changes from GameScene:
 *   timeLeft  — seconds remaining (3600 = 60:00)
 *   hp        — player health (0–3)
 *   xp        — experience points
 *
 * Layout:
 *   Top bar     — timer (centre), XP (left)
 *   Objective   — single-line banner below timer
 *   Bottom-left — 3 HP hearts
 *   Top-right   — minimap placeholder
 */

import { buildChecklist, formatProgress, STATUS_SYMBOLS, STATUS_COLORS } from '../gameobjects/checklist_logic.js';
import { getNextObjective, hasObjectiveChanged, PULSE_DURATION_MS } from '../gameobjects/objective_logic.js';

const MAX_HP = 3;
const HEART_W = 16;
const HEART_H = 14;
const HEART_GAP = 5;

// Safe margin from canvas edges to prevent cropping on smaller viewports
const EDGE_PAD = 20;

export default class HUD extends Phaser.Scene {
  constructor() {
    super({ key: "hud" });
  }

  create() {
    this.w = this.sys.game.config.width;
    this.h = this.sys.game.config.height;

    this.buildTopBar();
    this.buildTimer();
    this.buildXP();
    this.buildHearts();
    this.buildMinimap();
    this.buildChecklist();

    this.buildObjectiveBanner();

    // Sync to whatever is already in the registry
    this.updateTimerDisplay(this.registry.get("timeLeft") ?? 3600);
    this.updateHearts(this.registry.get("hp") ?? MAX_HP);
    this.updateXP(this.registry.get("xp") ?? 0);
    this.updateSystems(this.registry.get("systemsInstalled") ?? 0);
    this.updatePhase(this.registry.get('stormPhase') ?? 1);
    this.refreshObjective();

    // Tick every real second — HUDScene owns the countdown
    this.countdown = this.time.addEvent({
      delay: 1000,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });

    // React to registry changes pushed by GameScene
    this.registry.events.on("changedata", this.onRegistryChange, this);

    // TAB key — capture to prevent browser stealing focus/scrolling
    this._tabKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB, true, true
    );
    this._tabKey.on('down', this._toggleChecklist, this);

    // Key-specific listeners for objective banner recomputation
    this._onSystemsChanged = () => this.refreshObjective();
    this._onInventoryChanged = () => this.refreshObjective();
    this.registry.events.on("changedata-systemsInstalled", this._onSystemsChanged, this);
    this.registry.events.on("changedata-inventory", this._onInventoryChanged, this);

    // Cleanup all listeners on shutdown
    this.events.once('shutdown', () => {
      this._cleanupChecklist();
      this.registry.events.off("changedata-systemsInstalled", this._onSystemsChanged, this);
      this.registry.events.off("changedata-inventory", this._onInventoryChanged, this);
    });
  }

  // ─── Layout builders ────────────────────────────────────────────────────────

  buildTopBar() {
    // Semi-transparent bar across the full top
    this.add
      .rectangle(this.w / 2, 26, this.w, 52, 0x000000)
      .setAlpha(0.55);
  }

  buildTimer() {
    // Small label
    this.add
      .bitmapText(this.w / 2, 8, "default", "TIME REMAINING", 10)
      .setOrigin(0.5)
      .setTint(0x888888);

    // Large clock — the most important number in the game
    this.timerText = this.add
      .bitmapText(this.w / 2, 18, "default", "60:00", 30)
      .setOrigin(0.5)
      .setTint(0x4fffaa);
  }

  buildXP() {
    this.add
      .bitmapText(EDGE_PAD, 8, "default", "XP", 10)
      .setTint(0x888888);

    this.xpText = this.add
      .bitmapText(EDGE_PAD, 20, "default", "0", 22)
      .setTint(0xffdd00);
  }

  buildHearts() {
    // Label
    this.add
      .bitmapText(EDGE_PAD, this.h - EDGE_PAD - 30, "default", "HP", 10)
      .setTint(0x888888);

    // 3 heart rectangles
    this.hearts = [];
    for (let i = 0; i < MAX_HP; i++) {
      const x = EDGE_PAD + i * (HEART_W + HEART_GAP);
      const heart = this.add
        .rectangle(x + HEART_W / 2, this.h - EDGE_PAD - 10, HEART_W, HEART_H, 0xdd2222)
        .setOrigin(0.5);
      this.hearts.push(heart);
    }
  }

  buildMinimap() {
    const mw = 130, mh = 90;
    const mx = this.w - mw / 2 - EDGE_PAD;
    const my = mh / 2 + 60; // sits just below the top bar

    // Background fill
    this.add.rectangle(mx, my, mw, mh, 0x000000).setAlpha(0.7);

    // Border
    const border = this.add.graphics();
    border.lineStyle(1, 0x4fffaa, 0.5);
    border.strokeRect(mx - mw / 2, my - mh / 2, mw, mh);

    // Header label
    this.add
      .bitmapText(mx, my - 24, 'default', 'ROCKET', 10)
      .setOrigin(0.5).setTint(0x4fffaa).setAlpha(0.8);

    // Live systems counter — updated via updateSystems()
    this.systemsText = this.add
      .bitmapText(mx, my - 8, 'default', '0 / 5', 26)
      .setOrigin(0.5).setTint(0xffee44);

    // Footer label
    this.add
      .bitmapText(mx, my + 20, 'default', 'SYSTEMS', 10)
      .setOrigin(0.5).setTint(0x888888);
  }

  buildObjectiveBanner() {
    // Single line directly below the timer (timer bottom ≈ y 33 + some pad)
    const bannerY = 52;
    this.objectiveText = this.add
      .bitmapText(this.w / 2, bannerY, 'default', '', 12)
      .setOrigin(0.5)
      .setTint(0xcccccc)
      .setMaxWidth(this.w - EDGE_PAD * 2);

    // Track previous objective for pulse-on-change detection
    this._prevObjective = null;
  }

  /**
   * Recompute the current objective from registry state.
   * Only pulses the banner when the resolved text actually changes.
   */
  refreshObjective() {
    if (!this.sys.isActive()) return;
    if (!this.objectiveText?.active) return;

    const systemsInstalled = this.registry.get('systemsInstalled') ?? 0;
    const inventory = this.registry.get('inventory') ?? [];

    const objective = getNextObjective({ systemsInstalled, inventory });

    // Update text
    this.objectiveText.setText(objective.text);

    // Tint: cyan for completion, grey-white otherwise
    this.objectiveText.setTint(objective.isComplete ? 0x4fffaa : 0xcccccc);

    // Pulse only when objective text actually changed
    if (hasObjectiveChanged(this._prevObjective, objective)) {
      // Kill any existing pulse tween before creating a new one
      if (this._objectivePulse) {
        this._objectivePulse.stop();
        this._objectivePulse = null;
      }
      this.objectiveText.setScale(1);
      this.objectiveText.setAlpha(1);

      this._objectivePulse = this.tweens.add({
        targets: this.objectiveText,
        scaleX: { from: 1.15, to: 1.0 },
        scaleY: { from: 1.15, to: 1.0 },
        alpha: { from: 0.6, to: 1.0 },
        duration: PULSE_DURATION_MS,
        ease: 'Back.Out',
        onComplete: () => {
          if (this.objectiveText?.active) {
            this.objectiveText.setScale(1);
            this.objectiveText.setAlpha(1);
          }
          this._objectivePulse = null;
        },
      });
    }

    this._prevObjective = objective;
  }

  // ─── Countdown ─────────────────────────────────────────────────────────────

  tick() {
    const current = this.registry.get("timeLeft") ?? 0;
    const next = Math.max(0, current - 1);
    this.registry.set("timeLeft", next);

    if (next === 0) {
      this.countdown.remove(false);
      this.registry.set("timerExpired", true);
    }
  }

  // ─── Registry listener ──────────────────────────────────────────────────────

  onRegistryChange(parent, key, value) {
    // Guard against stale listeners firing after scene.stop() destroys game objects.
    // sys.isActive() is false once the scene has been stopped or shut down.
    if (!this.sys.isActive()) return;

    switch (key) {
      case "timeLeft":        this.updateTimerDisplay(value); break;
      case "hp":              this.updateHearts(value);       break;
      case "xp":              this.updateXP(value);           break;
      case "systemsInstalled": this.updateSystems(value);     break;
      case "stormPhase":      this.updatePhase(value);        break;
      case "hudToast":         this.showStormToast(value);       break;
      case "achievementToast": this.showAchievementToast(value); break;
    }
  }

  // ─── Display updaters ───────────────────────────────────────────────────────

  updateTimerDisplay(seconds) {
    if (!this.timerText?.active) return;
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    this.timerText.setText(`${m}:${s}`);

    // Final-minute urgency pulse — phase tint governs everything above 60s
    if (seconds <= 60) {
      this.timerText.setTint(0xff3333);
      if (!this.timerPulse) {
        this.timerPulse = this.tweens.add({
          targets: this.timerText,
          alpha: { from: 1, to: 0.35 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  updatePhase(phase) {
    if (!this.timerText?.active) return;
    const PHASE_TINTS = { 1: 0x4fffaa, 2: 0xffee44, 3: 0xff8800, 4: 0xff2222 };
    const tint = PHASE_TINTS[phase] ?? 0x4fffaa;

    // Don't override the final-minute urgency pulse
    const timeLeft = this.registry.get('timeLeft') ?? 3600;
    if (timeLeft > 60) {
      this.timerText.setTint(tint);
    }
  }

  showStormToast(raw) {
    if (!raw) return;
    // Strip timestamp suffix added to force re-fire on repeated messages
    const message = raw.split('|')[0].trim();
    if (!message) return;

    this._toastText?.destroy();
    this._toastText = null;

    // Position below the top HUD bar (around y=120 on a 640px screen)
    this._toastText = this.add
      .bitmapText(this.cameras.main.width / 2, 120, 'default', message, 20)
      .setOrigin(0.5)
      .setTint(0xff8800)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);

    this.tweens.add({
      targets:  this._toastText,
      alpha:    { from: 0, to: 1 },
      duration: 400,
      hold:     2500,
      yoyo:     true,
      onComplete: () => {
        this._toastText?.destroy();
        this._toastText = null;
      },
    });
  }

  /**
   * Achievement toast — slides in from the right edge, holds, then slides back out.
   * Cyan (0x4fffaa) and right-aligned to distinguish from the orange storm toast.
   */
  showAchievementToast(raw) {
    if (!raw) return;
    const label = raw.split('|')[0].trim();
    if (!label) return;

    this._achievementToast?.destroy();
    this._achievementToast = null;

    const offscreenX = this.w + 200;
    const targetX    = this.w - EDGE_PAD;

    const text = this.add
      .bitmapText(offscreenX, 80, 'default', label, 14)
      .setOrigin(1, 0.5)
      .setTint(0x4fffaa)
      .setDropShadow(1, 2, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(25);  // above storm toast (20), below combo text (60)

    this._achievementToast = text;

    // Slide in
    this.tweens.add({
      targets: text,
      x: targetX,
      duration: 320,
      ease: 'Back.Out',
      onComplete: () => {
        // Hold then slide back out
        this.time.delayedCall(2800, () => {
          this.tweens.add({
            targets: text,
            x: offscreenX,
            duration: 260,
            ease: 'Back.In',
            onComplete: () => {
              text?.destroy();
              if (this._achievementToast === text) this._achievementToast = null;
            },
          });
        });
      },
    });
  }

  updateHearts(hp) {
    if (!this.hearts?.length) return;
    this.hearts.forEach((heart, i) => {
      heart.setFillStyle(i < hp ? 0xdd2222 : 0x2a2a2a);
    });
  }

  updateXP(xp) {
    if (!this.xpText?.active) return;
    this.xpText.setText(String(xp));
  }

  updateSystems(n) {
    this.systemsText?.setText(`${n} / 5`);
    this.systemsText?.setTint(n >= 5 ? 0x4fffaa : n >= 4 ? 0xff44aa : 0xffee44);
  }

  // ─── System Checklist Overlay (TAB) ─────────────────────────────────────────

  buildChecklist() {
    this._checklistOpen = false;
    this._checklistElements = [];
  }

  _toggleChecklist() {
    if (!this.sys.isActive()) return;

    if (this._checklistOpen) {
      this._hideChecklist();
    } else {
      this._showChecklist();
    }
  }

  _showChecklist() {
    this._checklistOpen = true;
    this._destroyChecklistElements();

    const cx = this.w / 2;
    const cy = this.h / 2;
    const panelW = this.w * 0.8;
    const panelH = this.h * 0.85;

    // Semi-transparent backdrop (depth 100 — above all HUD elements)
    const bg = this.add.rectangle(cx, cy, panelW, panelH, 0x000000)
      .setAlpha(0.82)
      .setDepth(100)
      .setScrollFactor(0);
    this._checklistElements.push(bg);

    // Border
    const border = this.add.graphics().setDepth(101).setScrollFactor(0);
    border.lineStyle(2, 0x4fffaa, 0.7);
    border.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    this._checklistElements.push(border);

    // Header
    const installed = this.registry.get('systemsInstalled') ?? 0;
    const headerStr = `SYSTEM CHECKLIST — ${formatProgress(installed, 5)}`;
    const header = this.add.bitmapText(cx, cy - panelH / 2 + 20, 'default', headerStr, 14)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setDepth(101)
      .setScrollFactor(0);
    this._checklistElements.push(header);

    // Time remaining
    const timeLeft = this.registry.get('timeLeft') ?? 0;
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    const timeStr = `TIME: ${m}:${s}`;
    const timeText = this.add.bitmapText(cx, cy - panelH / 2 + 40, 'default', timeStr, 12)
      .setOrigin(0.5)
      .setTint(0xffee44)
      .setDepth(101)
      .setScrollFactor(0);
    this._checklistElements.push(timeText);

    // Build checklist data
    const inventory = this.registry.get('inventory') ?? [];
    const rows = buildChecklist({ systemsInstalled: installed, inventory });

    // Color map for status
    const TINT_MAP = { green: 0x44ff88, yellow: 0xffdd00, gray: 0x888888 };

    // Render each system row
    const startY = cy - panelH / 2 + 65;
    const rowHeight = (panelH - 100) / 5;
    const leftX = cx - panelW / 2 + 20;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const y = startY + i * rowHeight;
      const statusKey = row.status === 'installed' ? 'INSTALLED'
        : row.status === 'in_inventory' ? 'IN_INVENTORY' : 'NEEDED';
      const symbol = STATUS_SYMBOLS[statusKey];
      const tint = TINT_MAP[STATUS_COLORS[statusKey]];

      // System line: [X] Engine — Fuel Injector
      const sysStr = `${symbol} ${row.systemLabel} — ${row.componentLabel}`;
      const sysText = this.add.bitmapText(leftX, y, 'default', sysStr, 12)
        .setTint(tint)
        .setDepth(101)
        .setScrollFactor(0);
      this._checklistElements.push(sysText);

      // Ingredient details (below system line, indented)
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

        const ingText = this.add.bitmapText(leftX + 12, y + 16 + j * 14, 'default', ingStr, 10)
          .setTint(ingTint)
          .setDepth(101)
          .setScrollFactor(0);
        this._checklistElements.push(ingText);
      }
    }

    // Footer hint
    const footerStr = 'TAB to close';
    const footer = this.add.bitmapText(cx, cy + panelH / 2 - 16, 'default', footerStr, 10)
      .setOrigin(0.5)
      .setTint(0x666666)
      .setDepth(101)
      .setScrollFactor(0);
    this._checklistElements.push(footer);
  }

  _hideChecklist() {
    this._checklistOpen = false;
    this._destroyChecklistElements();
  }

  _destroyChecklistElements() {
    for (const el of this._checklistElements) {
      if (el?.active) el.destroy();
    }
    this._checklistElements = [];
  }

  _cleanupChecklist() {
    this._tabKey?.off('down', this._toggleChecklist, this);
    this._tabKey = null;
    this._destroyChecklistElements();
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  shutdown() {
    this.registry.events.off("changedata", this.onRegistryChange, this);
    this._cleanupChecklist();
    this._toastText?.destroy();
    this._toastText = null;
    this._achievementToast?.destroy();
    this._achievementToast = null;
    if (this._objectivePulse) {
      this._objectivePulse.stop();
      this._objectivePulse = null;
    }
    this._prevObjective = null;
  }
}
