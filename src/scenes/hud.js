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
      .bitmapText(this.w / 2, 6, "default", "TIME REMAINING", 10)
      .setOrigin(0.5)
      .setTint(0x888888);

    // Large clock — the most important number in the game
    this.timerText = this.add
      .bitmapText(this.w / 2, 16, "default", "60:00", 30)
      .setOrigin(0.5)
      .setTint(0x4fffaa);
  }

  buildXP() {
    this.add
      .bitmapText(16, 6, "default", "XP", 10)
      .setTint(0x888888);

    this.xpText = this.add
      .bitmapText(16, 18, "default", "0", 22)
      .setTint(0xffdd00);
  }

  buildHearts() {
    // Label
    this.add
      .bitmapText(16, this.h - 38, "default", "HP", 10)
      .setTint(0x888888);

    // 3 heart rectangles
    this.hearts = [];
    for (let i = 0; i < MAX_HP; i++) {
      const x = 16 + i * (HEART_W + HEART_GAP);
      const heart = this.add
        .rectangle(x + HEART_W / 2, this.h - 18, HEART_W, HEART_H, 0xdd2222)
        .setOrigin(0.5);
      this.hearts.push(heart);
    }
  }

  buildMinimap() {
    const mw = 130;
    const mh = 90;
    const mx = this.w - mw / 2 - 8;
    const my = mh / 2 + 60; // sits just below the top bar

    // Background fill
    this.add
      .rectangle(mx, my, mw, mh, 0x000000)
      .setAlpha(0.7);

    // Border
    const border = this.add.graphics();
    border.lineStyle(1, 0x4fffaa, 0.5);
    border.strokeRect(mx - mw / 2, my - mh / 2, mw, mh);

    // Placeholder label
    this.add
      .bitmapText(mx, my, "default", "MINIMAP", 11)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setAlpha(0.4);

    this.add
      .bitmapText(mx, my + 16, "default", "(Phase 3)", 9)
      .setOrigin(0.5)
      .setTint(0x555555);
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
    switch (key) {
      case "timeLeft": this.updateTimerDisplay(value); break;
      case "hp":       this.updateHearts(value);       break;
      case "xp":       this.updateXP(value);           break;
    }
  }

  // ─── Display updaters ───────────────────────────────────────────────────────

  updateTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    this.timerText.setText(`${m}:${s}`);

    // Colour shifts signal urgency
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
    } else if (seconds <= 300) {
      this.timerText.setTint(0xff8800);
    } else {
      this.timerText.setTint(0x4fffaa);
    }
  }

  updateHearts(hp) {
    this.hearts.forEach((heart, i) => {
      heart.setFillStyle(i < hp ? 0xdd2222 : 0x2a2a2a);
    });
  }

  updateXP(xp) {
    this.xpText.setText(String(xp));
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  shutdown() {
    this.registry.events.off("changedata", this.onRegistryChange, this);
  }
}
