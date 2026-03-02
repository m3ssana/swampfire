/**
 * Transition — SPACE-to-continue micro-intro cinematic
 *
 * Each phase waits for SPACE before advancing. No auto-timers. Players set
 * the pace so they can read the EAS broadcast, study the rocket, and absorb
 * the mission before the clock starts.
 *
 * Phase 1  Emergency Alert System broadcast + scrolling ticker
 * Phase 2  Hard cut → swamp clearing with placeholder rocket
 * Phase 3  FIND. / BUILD. / LAUNCH. text slam (auto-animates, then waits)
 * Phase 4  60:00 countdown → SPACE starts the game
 */
export default class Transition extends Phaser.Scene {
  constructor() {
    super({ key: "transition" });
  }

  create() {
    this.sound.stopAll();
    this.width = this.sys.game.config.width;
    this.height = this.sys.game.config.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2;

    // Full-screen black overlay used for hard cuts. Always on top.
    this.cutScreen = this.add
      .rectangle(this.cx, this.cy, this.width, this.height, 0x000000)
      .setAlpha(1)
      .setDepth(100);

    this.playMusic();

    // Reveal phase 1 from black
    this.tweens.add({
      targets: this.cutScreen,
      alpha: 0,
      duration: 200,
      onComplete: () => this.showEmergencyAlert(),
    });
  }

  // ─── Shared: blinking SPACE prompt ────────────────────────────────────────

  addSpacePrompt(label = "PRESS SPACE TO CONTINUE") {
    const prompt = this.add
      .bitmapText(this.cx, this.height - 40, "default", label, 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(10)
      .setAlpha(0);

    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: prompt,
          alpha: { from: 1, to: 0.2 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      },
    });

    return prompt;
  }

  // ─── Shared: wait for SPACE, then run callback ────────────────────────────

  waitForSpace(callback) {
    this.input.keyboard.once("keydown-SPACE", () => {
      callback();
    }, this);
  }

  // ─── Phase 1: Emergency Alert System ──────────────────────────────────────

  showEmergencyAlert() {
    this.cameras.main.setBackgroundColor(0x0a0a0a);

    this.easObjects = [];

    // Red EAS header bar
    const headerBg = this.add.rectangle(this.cx, 44, this.width, 72, 0xbb0000);
    this.easObjects.push(headerBg);

    const headerText = this.add
      .bitmapText(this.cx, 30, "default", ">> EMERGENCY ALERT SYSTEM <<", 22)
      .setOrigin(0.5)
      .setTint(0xffffff);
    this.easObjects.push(headerText);

    const subText = this.add
      .bitmapText(this.cx, 58, "default", "NATIONAL WEATHER SERVICE -- TAMPA BAY FL", 14)
      .setOrigin(0.5)
      .setTint(0xffdddd);
    this.easObjects.push(subText);

    // Orange ticker strip
    const tickerBg = this.add.rectangle(this.cx, 104, this.width, 28, 0x221100);
    this.easObjects.push(tickerBg);

    const msg =
      "  HURRICANE KENDRA -- CAT 6 -- LANDFALL 60 MIN -- EVACUATE IMMEDIATELY -- ALL COASTAL ZONES -- LAND O LAKES FL 34639 -- ";
    this.ticker = this.add
      .bitmapText(this.width + 20, 97, "default", msg + msg, 16)
      .setTint(0xffaa00);
    this.easObjects.push(this.ticker);

    // Ticker loops indefinitely until the player advances
    this.tickerTween = this.tweens.add({
      targets: this.ticker,
      x: { from: this.width + 20, to: -2200 },
      duration: 6000,
      ease: "Linear",
      repeat: -1,
    });

    // Body text block
    const bodyLines = [
      "A CATEGORY 6 HYPERCANE HAS FORMED IN THE GULF OF MEXICO.",
      "DIRECT LANDFALL ON PASCO COUNTY IN APPROXIMATELY 60 MINUTES.",
      "ALL RESIDENTS MUST EVACUATE IMMEDIATELY.",
      "IF YOU CANNOT EVACUATE, SEEK INTERIOR SHELTER NOW.",
    ];
    bodyLines.forEach((line, i) => {
      const t = this.add
        .bitmapText(this.cx, 160 + i * 36, "default", line, 16)
        .setOrigin(0.5)
        .setTint(0xffffff);
      this.easObjects.push(t);
    });

    const shelter = this.add
      .bitmapText(this.cx, 380, "default", "THIS IS NOT A TEST", 28)
      .setOrigin(0.5)
      .setTint(0xff4444);
    this.easObjects.push(shelter);

    this.tweens.add({
      targets: shelter,
      alpha: { from: 1, to: 0.2 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    // CRT static flicker
    const staticFx = this.add
      .rectangle(this.cx, this.cy, this.width, this.height, 0xffffff)
      .setAlpha(0)
      .setDepth(50);
    this.easObjects.push(staticFx);

    this.staticTimer = this.time.addEvent({
      delay: 80,
      callback: () => staticFx.setAlpha(Math.random() * 0.05),
      loop: true,
    });

    this.easObjects.push(this.addSpacePrompt("PRESS SPACE TO CONTINUE"));

    this.waitForSpace(() => {
      if (this.staticTimer) this.staticTimer.remove();
      if (this.tickerTween) this.tickerTween.stop();
      this.cutToRocketClearing();
    });
  }

  // ─── Phase 2: Hard cut to rocket clearing ─────────────────────────────────

  cutToRocketClearing() {
    // Hard cut: snap to black, destroy phase 1 content, then reveal phase 2
    this.cutScreen.setAlpha(1);
    this.easObjects.forEach((o) => o.destroy());
    this.easObjects = [];

    this.cameras.main.setBackgroundColor(0x1a2e1a);

    // Ground plane
    this.add.rectangle(this.cx, 560, this.width, 160, 0x2a3d1a);

    // Placeholder rocket
    this.add.rectangle(this.cx, 430, 28, 130, 0x7a7a7a);           // body
    this.add.rectangle(this.cx, 360, 16, 40, 0x9a9a9a);            // upper stage
    this.add.rectangle(this.cx - 18, 480, 12, 36, 0x5a5a5a).setAngle(-15); // left fin
    this.add.rectangle(this.cx + 18, 480, 12, 36, 0x5a5a5a).setAngle(15);  // right fin
    this.add.rectangle(this.cx, 330, 10, 28, 0xcccccc);             // nose cone

    // Launch pad
    this.add.rectangle(this.cx, 500, 90, 10, 0x555555);
    this.add.rectangle(this.cx - 36, 520, 8, 28, 0x444444);
    this.add.rectangle(this.cx + 36, 520, 8, 28, 0x444444);

    this.add
      .bitmapText(this.cx, 580, "default", "CYPRESS CREEK PRESERVE -- ZONE 0", 13)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setAlpha(0.6);

    // Fade in from hard cut
    this.tweens.add({
      targets: this.cutScreen,
      alpha: 0,
      duration: 120,
    });

    this.addSpacePrompt("PRESS SPACE TO CONTINUE");

    this.waitForSpace(() => this.showTextSlam());
  }

  // ─── Phase 3: FIND. BUILD. LAUNCH. text slam ──────────────────────────────

  showTextSlam() {
    const words = ["FIND.", "BUILD.", "LAUNCH."];
    let activeText = null;
    const totalDuration = words.length * 650 + 400;

    words.forEach((word, i) => {
      this.time.delayedCall(i * 650, () => {
        this.cameras.main.shake(180, 0.01 + i * 0.007);

        if (activeText) {
          this.tweens.add({ targets: activeText, alpha: 0, duration: 120 });
        }

        activeText = this.add
          .bitmapText(this.cx, this.cy - 60, "default", word, 96)
          .setOrigin(0.5)
          .setTint(0xffffff)
          .setScale(2.2);

        this.tweens.add({
          targets: activeText,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          ease: "Back.Out",
        });
      });
    });

    // Show SPACE prompt only after all three words have landed
    this.time.delayedCall(totalDuration, () => {
      this.addSpacePrompt("PRESS SPACE TO CONTINUE");
      this.waitForSpace(() => this.showCountdown());
    });
  }

  // ─── Phase 4: 60:00 countdown → begin ────────────────────────────────────

  showCountdown() {
    // Clear the text slam word if still visible
    this.cameras.main.setBackgroundColor(0x1a2e1a);

    const clock = this.add
      .bitmapText(this.cx, this.cy - 20, "default", "60:00", 52)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setAlpha(0);

    const label = this.add
      .bitmapText(this.cx, this.cy + 44, "default", "MISSION CLOCK STARTED", 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setAlpha(0);

    this.tweens.add({
      targets: [clock, label],
      alpha: 1,
      duration: 500,
    });

    this.addSpacePrompt("PRESS SPACE TO BEGIN");
    this.waitForSpace(() => this.loadNext());
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  loadNext() {
    // Seed a fresh game session in the registry before handing off to GameScene.
    // HUDScene reads these on launch; GameScene reads hp/xp on player events.
    this.registry.set("hp", 3);
    this.registry.set("xp", 0);
    this.registry.set("timeLeft", 3600); // 60 minutes in seconds
    this.registry.set("timerExpired", false);
    this.registry.set("inventory", []);  // cleared fresh each run; fed by item pickups
    this.registry.set("systemsInstalled", 0); // reset rocket progress each run

    this.cameras.main.fade(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("game", { name: "ZONE 0", number: 0 });
    });
  }

  playMusic(theme = "music") {
    this.theme = this.sound.add(theme);
    this.theme.stop();
    this.theme.play({
      mute: false,
      volume: 0.2,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: true,
      delay: 0,
    });
  }
}
