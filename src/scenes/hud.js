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
 *   Bottom-left — 3 HP hearts
 *   Top-right   — minimap placeholder
 */

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

    // Sync to whatever is already in the registry
    this.updateTimerDisplay(this.registry.get("timeLeft") ?? 3600);
    this.updateHearts(this.registry.get("hp") ?? MAX_HP);
    this.updateXP(this.registry.get("xp") ?? 0);
    this.updateSystems(this.registry.get("systemsInstalled") ?? 0);
    this.updatePhase(this.registry.get('stormPhase') ?? 1);

    // Tick every real second — HUDScene owns the countdown
    this.countdown = this.time.addEvent({
      delay: 1000,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });

    // React to registry changes pushed by GameScene
    this.registry.events.on("changedata", this.onRegistryChange, this);
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
      .bitmapText(mx, my - 8, 'default', '0 / 4', 26)
      .setOrigin(0.5).setTint(0xffee44);

    // Footer label
    this.add
      .bitmapText(mx, my + 20, 'default', 'SYSTEMS', 10)
      .setOrigin(0.5).setTint(0x888888);
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
    this.systemsText?.setText(`${n} / 4`);
    this.systemsText?.setTint(n >= 4 ? 0x4fffaa : 0xffee44);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  shutdown() {
    this.registry.events.off("changedata", this.onRegistryChange, this);
    this._toastText?.destroy();
    this._toastText = null;
    this._achievementToast?.destroy();
    this._achievementToast = null;
  }
}
