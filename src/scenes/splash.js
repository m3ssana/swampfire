export default class Splash extends Phaser.Scene {
  constructor() {
    super({ key: "splash" });
  }

  create() {
    this.width = this.sys.game.config.width;
    this.height = this.sys.game.config.height;
    this.center_width = this.width / 2;
    this.center_height = this.height / 2;

    this.cameras.main.setBackgroundColor(0x000000);
    this.showTitle();
    this.addPlayerShowcase();
    this.addAnimationTweens();

    this.time.delayedCall(1000, () => this.showInstructions(), null, this);

    this.input.keyboard.on("keydown-SPACE", () => this.startGame(), this);
    this.input.keyboard.on("keydown-ENTER", () => this.startGame(), this);

    // Play menu theme if the audio file has been loaded (skip if missing)
    if (this.cache.audio.exists("menu_theme")) {
      this.playMusic("menu_theme");
    }
  }

  startGame() {
    if (this.theme) this.theme.stop();
    this.scene.start("transition");
  }

  /*
    Three-layer title stack: drifting shadow, dark body, bright highlight.
    Palette is swamp green to establish the game's visual identity immediately.
  */
  showTitle() {
    // Layer 1 — shadow (animates to drift right+down)
    this.textShadow1 = this.add
      .bitmapText(this.center_width, 110, "default", "SWAMPFIRE", 72)
      .setTint(0x1a4d2a)
      .setOrigin(0.5);
    this.textShadow2 = this.add
      .bitmapText(this.center_width, 210, "default", "PROTOCOL", 72)
      .setTint(0x1a4d2a)
      .setOrigin(0.5);

    // Layer 2 — dark body (creates depth against the shadow)
    this.add
      .bitmapText(this.center_width, 110, "default", "SWAMPFIRE", 72)
      .setTint(0x0d1f10)
      .setOrigin(0.5);
    this.add
      .bitmapText(this.center_width, 210, "default", "PROTOCOL", 72)
      .setTint(0x0d1f10)
      .setOrigin(0.5);

    // Layer 3 — bright highlight (top, reads as the "real" text)
    this.add
      .bitmapText(this.center_width, 110, "default", "SWAMPFIRE", 74)
      .setTint(0x4fffaa)
      .setOrigin(0.5);
    this.add
      .bitmapText(this.center_width, 210, "default", "PROTOCOL", 74)
      .setTint(0x4fffaa)
      .setOrigin(0.5);

    // Shadow drift tween — gives the title a subtle, unsettling pulse
    this.tweens.add({
      targets: [this.textShadow1, this.textShadow2],
      duration: 1200,
      x: "+=8",
      y: "+=8",
      yoyo: true,
      repeat: -1,
    });
  }

  /*
    Show the player sprite walking across the screen so new players immediately
    know who they're controlling. No wizard — this isn't a dungeon anymore.
  */
  addPlayerShowcase() {
    this.playerSprite = this.add
      .sprite(this.width - 80, 360, "player")
      .setScale(2.5);

    this.anims.create({
      key: "splash_walk",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
    this.playerSprite.anims.play("splash_walk");
  }

  /*
    Player walks the full width of the screen, flipping direction on each repeat.
    Gives the splash screen life without needing any extra art assets.
  */
  addAnimationTweens() {
    this.tweens.add({
      targets: this.playerSprite,
      x: { from: this.width - 80, to: 80 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      onYoyo: () => {
        this.playerSprite.flipX = true;
      },
      onRepeat: () => {
        this.playerSprite.flipX = false;
      },
    });
  }

  /*
    Controls block. Matches spec: WASD move, Shift sprint, E interact.
    Shown after a 1s delay so the title has time to land first.
  */
  showInstructions() {
    const cx = this.center_width;

    this.add
      .bitmapText(cx, 310, "default", "WASD  —  Move", 22)
      .setDropShadow(1, 1, 0x4fffaa, 0.5)
      .setOrigin(0.5);
    this.add
      .bitmapText(cx, 345, "default", "SHIFT  —  Sprint", 22)
      .setDropShadow(1, 1, 0x4fffaa, 0.5)
      .setOrigin(0.5);
    this.add
      .bitmapText(cx, 380, "default", "E  —  Interact", 22)
      .setDropShadow(1, 1, 0x4fffaa, 0.5)
      .setOrigin(0.5);

    // Hurricane urgency tagline
    this.add
      .bitmapText(cx, 430, "default", "HURRICANE KENDRA IS COMING.", 18)
      .setTint(0xff6633)
      .setOrigin(0.5);
    this.add
      .bitmapText(cx, 455, "default", "FIND. BUILD. LAUNCH.", 18)
      .setTint(0xff6633)
      .setOrigin(0.5);

    // Blinking prompt
    this.startPrompt = this.add
      .bitmapText(cx, 510, "default", "PRESS SPACE TO START", 22)
      .setDropShadow(1, 1, 0x1a4d2a, 0.8)
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.startPrompt,
      duration: 400,
      alpha: { from: 1, to: 0 },
      repeat: -1,
      yoyo: true,
    });
  }

  playMusic(theme = "splash") {
    this.theme = this.sound.add(theme);
    this.theme.stop();
    this.theme.play({
      mute: false,
      volume: 0.3,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: true,
      delay: 0,
    });
  }
}
