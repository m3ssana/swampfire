/**
 * Transition — 10-second micro-intro cinematic
 *
 * Sequence:
 *  Phase 1 (0–3s)   Emergency Alert System broadcast + scrolling ticker
 *  Phase 2 (3–4s)   Hard cut → swamp clearing with placeholder rocket
 *  Phase 3 (4–6s)   FIND. / BUILD. / LAUNCH. text slam with screen shake
 *  Phase 4 (6–8s)   60:00 countdown appears, then cut to Game
 *
 * Any key skips the entire sequence.
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

    this.skipped = false;

    // Full-screen black overlay used for hard cuts between phases.
    // Lives at the top of the display list so it always covers scene content.
    this.cutScreen = this.add
      .rectangle(this.cx, this.cy, this.width, this.height, 0x000000)
      .setAlpha(1)
      .setDepth(100);

    this.input.keyboard.once("keydown", () => this.skipToGame(), this);

    this.playMusic();

    // Reveal phase 1 from black
    this.tweens.add({
      targets: this.cutScreen,
      alpha: 0,
      duration: 150,
      onComplete: () => this.showEmergencyAlert(),
    });
  }

  // ─── Phase 1: Emergency Alert System ───────────────────────────────────────

  showEmergencyAlert() {
    this.cameras.main.setBackgroundColor(0x0a0a0a);

    this.easObjects = [];

    // Red EAS header bar
    const headerBg = this.add.rectangle(this.cx, 44, this.width, 72, 0xbb0000);
    this.easObjects.push(headerBg);

    // Warning label
    const headerText = this.add
      .bitmapText(this.cx, 30, "default", ">> EMERGENCY ALERT SYSTEM <<", 22)
      .setOrigin(0.5)
      .setTint(0xffffff);
    this.easObjects.push(headerText);

    // Sub-label (agency / broadcast ID)
    const subText = this.add
      .bitmapText(this.cx, 58, "default", "NATIONAL WEATHER SERVICE -- TAMPA BAY FL", 14)
      .setOrigin(0.5)
      .setTint(0xffdddd);
    this.easObjects.push(subText);

    // Orange ticker strip
    const tickerBg = this.add.rectangle(this.cx, 104, this.width, 28, 0x221100);
    this.easObjects.push(tickerBg);

    // Scrolling ticker text — doubled so it feels continuous
    const msg =
      "  HURRICANE KENDRA -- CAT 6 -- LANDFALL 60 MIN -- EVACUATE IMMEDIATELY -- ALL COASTAL ZONES -- LAND O LAKES FL 34639 -- ";
    this.ticker = this.add
      .bitmapText(this.width + 20, 97, "default", msg + msg, 16)
      .setTint(0xffaa00);
    this.easObjects.push(this.ticker);

    this.tweens.add({
      targets: this.ticker,
      x: { from: this.width + 20, to: -2200 },
      duration: 3000,
      ease: "Linear",
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
        .bitmapText(this.cx, 170 + i * 34, "default", line, 16)
        .setOrigin(0.5)
        .setTint(0xffffff);
      this.easObjects.push(t);
    });

    // Flashing "TAKE SHELTER" warning at the bottom
    const shelter = this.add
      .bitmapText(this.cx, 400, "default", "THIS IS NOT A TEST", 28)
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

    // CRT static flicker overlay
    const staticFx = this.add
      .rectangle(this.cx, this.cy, this.width, this.height, 0xffffff)
      .setAlpha(0)
      .setDepth(50);
    this.easObjects.push(staticFx);

    this.staticTimer = this.time.addEvent({
      delay: 80,
      callback: () => {
        staticFx.setAlpha(Math.random() * 0.05);
      },
      repeat: 38,
    });

    this.time.delayedCall(3000, () => {
      if (!this.skipped) this.cutToRocketClearing();
    }, null, this);
  }

  // ─── Phase 2: Hard cut to rocket clearing ──────────────────────────────────

  cutToRocketClearing() {
    // Instant hard cut — snap cutScreen to opaque
    this.cutScreen.setAlpha(1);

    // Destroy EAS objects now that they're hidden
    this.easObjects.forEach((o) => o.destroy());
    this.easObjects = [];

    // Swamp clearing
    this.cameras.main.setBackgroundColor(0x1a2e1a);

    // Ground plane / clearing
    this.add.rectangle(this.cx, 560, this.width, 160, 0x2a3d1a);

    // Placeholder rocket — simple geometry stack
    this.add.rectangle(this.cx, 430, 28, 130, 0x7a7a7a); // body
    this.add.rectangle(this.cx, 360, 16, 40, 0x9a9a9a);  // upper stage
    this.add.rectangle(this.cx - 18, 480, 12, 36, 0x5a5a5a).setAngle(-15); // left fin
    this.add.rectangle(this.cx + 18, 480, 12, 36, 0x5a5a5a).setAngle(15);  // right fin
    this.add.rectangle(this.cx, 330, 10, 28, 0xcccccc);   // nose cone

    // Launch pad
    this.add.rectangle(this.cx, 500, 90, 10, 0x555555);
    this.add.rectangle(this.cx - 36, 520, 8, 28, 0x444444);
    this.add.rectangle(this.cx + 36, 520, 8, 28, 0x444444);

    // Zone label
    this.add
      .bitmapText(this.cx, 580, "default", "CYPRESS CREEK PRESERVE -- ZONE 0", 13)
      .setOrigin(0.5)
      .setTint(0x4fffaa)
      .setAlpha(0.6);

    // Fade in from the hard cut
    this.tweens.add({
      targets: this.cutScreen,
      alpha: 0,
      duration: 120,
    });

    this.time.delayedCall(1000, () => {
      if (!this.skipped) this.showTextSlam();
    }, null, this);
  }

  // ─── Phase 3: FIND. BUILD. LAUNCH. text slam ───────────────────────────────

  showTextSlam() {
    const words = ["FIND.", "BUILD.", "LAUNCH."];
    let activeText = null;

    words.forEach((word, i) => {
      this.time.delayedCall(i * 650, () => {
        if (this.skipped) return;

        // Shake intensity ramps up with each word
        this.cameras.main.shake(180, 0.01 + i * 0.007);

        // Fade out the previous word
        if (activeText) {
          this.tweens.add({
            targets: activeText,
            alpha: 0,
            duration: 120,
          });
        }

        activeText = this.add
          .bitmapText(this.cx, this.cy - 60, "default", word, 96)
          .setOrigin(0.5)
          .setTint(0xffffff)
          .setScale(2.2);

        // Punch-in scale smash → rest
        this.tweens.add({
          targets: activeText,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          ease: "Back.Out",
        });

        // Keep last word visible until phase 4
        if (i === words.length - 1) {
          this.time.delayedCall(700, () => {
            if (activeText && !this.skipped) {
              this.tweens.add({ targets: activeText, alpha: 0, duration: 200 });
            }
          });
        }
      });
    });

    // After all three words + a beat, show the countdown
    this.time.delayedCall(words.length * 650 + 800, () => {
      if (!this.skipped) this.showCountdown();
    }, null, this);
  }

  // ─── Phase 4: 60:00 countdown → launch into game ──────────────────────────

  showCountdown() {
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

    this.time.delayedCall(1800, () => {
      if (!this.skipped) this.loadNext();
    }, null, this);
  }

  // ─── Shared helpers ────────────────────────────────────────────────────────

  skipToGame() {
    if (this.skipped) return;
    this.skipped = true;
    this.loadNext();
  }

  loadNext() {
    this.skipped = true; // guard against double-fire
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
