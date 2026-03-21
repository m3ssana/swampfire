/**
 * EndRunScreen (key: "outro")
 *
 * Handles all three end states:
 *   "death"   — HP hit 0. Florida Man headline + stats.
 *   "timeout" — Timer hit 0:00. Hurricane made landfall.
 *   "victory" — All 4 systems installed. Placeholder for Phase 6.
 *
 * Stats are read from Phaser's global registry (set by HUDScene / GameScene).
 * SPACE or ENTER returns to the splash screen.
 */

// Florida Man death headlines — spec section 11.4.
// Chosen randomly since cause-of-death tracking comes in Phase 4.
const DEATH_MESSAGES = [
  "Killed by a wild boar in Conner Preserve.\nThe boar did not care about the hurricane.",
  "Electrocuted by a downed power line on\nLand O' Lakes Boulevard.",
  "Caught in structural collapse at Collier Commons.\nThe Publix sign landed on him.",
  "Bitten by a pygmy rattlesnake on Pump Station Road.\nIt was a juvenile. Three inches long.",
  "Hit by a flying shopping cart in the\nRaceTrac parking lot. Wind speed: 85 mph.",
  "Mauled by a feral cat behind the\nLand O' Lakes Library. Maria is devastated.",
  "Fell into a sinkhole on SR-52.\nThe karst geology of west-central Florida strikes again.",
  "Looted by a man in a Tampa Bay Buccaneers jersey.\nHe took the fuel injector and a granola bar.",
];

export default class Outro extends Phaser.Scene {
  constructor() {
    super({ key: "outro" });
  }

  init(data) {
    this.state = data.state || "death"; // "death" | "timeout" | "victory"
    this.underTheWire = data.underTheWire ?? false;
  }

  create() {
    this.w = this.sys.game.config.width;
    this.h = this.sys.game.config.height;
    this.cx = this.w / 2;
    this.cy = this.h / 2;

    // Pull run stats from registry
    const timeLeft = this.registry.get("timeLeft") ?? 0;
    const xp       = this.registry.get("xp")       ?? 0;
    const hp       = this.registry.get("hp")        ?? 0;

    this.elapsed   = 3600 - timeLeft; // seconds the player survived
    this.xp        = xp;
    this.hp        = hp;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    switch (this.state) {
      case "timeout": this.showTimeoutScreen(); break;
      case "victory": this.showVictoryScreen(); break;
      default:        this.showDeathScreen();   break;
    }

    this.addShareCard();
    this.addRestartPrompt();

    this.input.keyboard.on("keydown-SPACE", () => this.loadNext(), this);
    this.input.keyboard.on("keydown-ENTER", () => this.loadNext(), this);
  }

  // ─── Death screen ───────────────────────────────────────────────────────────

  showDeathScreen() {
    this.cameras.main.setBackgroundColor(0x1a0505);

    // Header
    this.add
      .bitmapText(this.cx, 52, "default", "JUAN IS DOWN", 48)
      .setOrigin(0.5)
      .setTint(0xff3333);

    this.add
      .bitmapText(this.cx, 100, "default", "CAUSE OF DEATH", 12)
      .setOrigin(0.5)
      .setTint(0x888888);

    // Random Florida Man headline
    const msg = Phaser.Utils.Array.GetRandom(DEATH_MESSAGES);
    this.add
      .bitmapText(this.cx, 128, "default", msg, 16)
      .setOrigin(0.5, 0)
      .setTint(0xffffff)
      .setCenterAlign();

    this.addDivider(230);
    this.addStatsRow(260);
  }

  // ─── Timeout screen ─────────────────────────────────────────────────────────

  showTimeoutScreen() {
    this.cameras.main.setBackgroundColor(0x05050a);

    // Header
    this.add
      .bitmapText(this.cx, 42, "default", "HURRICANE KENDRA HAS MADE LANDFALL", 22)
      .setOrigin(0.5)
      .setTint(0xff6633);

    this.add
      .bitmapText(this.cx, 80, "default",
        "Wind speeds exceeded 200 mph.\nThere were no survivors in Pasco County.", 15)
      .setOrigin(0.5, 0)
      .setTint(0xdddddd)
      .setCenterAlign();

    // Rocket progress — 0/4 until Phase 2 wires up system tracking
    const systems = this.registry.get("systemsInstalled") ?? 0;
    this.add
      .bitmapText(this.cx, 148, "default",
        `Juan's rocket sat ${systems}/4 systems complete\nin Cypress Creek Preserve.`, 15)
      .setOrigin(0.5, 0)
      .setTint(0x4fffaa)
      .setCenterAlign();

    this.addDivider(220);
    this.addStatsRow(250);
  }

  // ─── Victory screen (placeholder — Phase 6) ─────────────────────────────────

  showVictoryScreen() {
    this.cameras.main.setBackgroundColor(0x051a05);

    this.add
      .bitmapText(this.cx, 52, "default", "JUAN ESCAPES", 48)
      .setOrigin(0.5)
      .setTint(0x4fffaa);

    this.add
      .bitmapText(this.cx, 108, "default",
        "The rocket cleared the treeline at 11:47 AM EST.\nHurricane Kendra made landfall 6 minutes later.", 16)
      .setOrigin(0.5, 0)
      .setTint(0xffffff)
      .setCenterAlign();

    this.add
      .bitmapText(this.cx, 176, "default",
        '"Juan escaped. 7 billion others were not so lucky."', 13)
      .setOrigin(0.5, 0)
      .setTint(0x888888)
      .setCenterAlign();

    if (this.underTheWire) {
      this.add
        .bitmapText(this.cx, 208, "default", "** UNDER THE WIRE -- < 2 MIN REMAINING **", 14)
        .setOrigin(0.5)
        .setTint(0xff4444)
        .setCenterAlign();
    }

    const dividerY  = this.underTheWire ? 254 : 230;
    const statsY    = this.underTheWire ? 284 : 260;

    this.addDivider(dividerY);
    this.addStatsRow(statsY);

    // SYSTEMS INSTALLED — victory screen only
    const systems = this.registry.get("systemsInstalled") ?? 0;
    this.add
      .bitmapText(this.cx, statsY + 55, "default", `SYSTEMS INSTALLED: ${systems} / 4`, 18)
      .setOrigin(0.5)
      .setTint(0x00eeff);
  }

  // ─── Shared layout helpers ──────────────────────────────────────────────────

  addDivider(y) {
    const line = this.add.graphics();
    line.lineStyle(1, 0x333333, 1);
    line.lineBetween(80, y, this.w - 80, y);
  }

  addStatsRow(y) {
    const timeStr  = this.formatTime(this.elapsed);
    const cols = [
      { label: "TIME SURVIVED", value: timeStr },
      { label: "XP EARNED",     value: String(this.xp) },
      { label: "HP REMAINING",  value: String(this.hp) + " / 3" },
    ];

    cols.forEach((col, i) => {
      const x = 160 + i * 320;

      this.add
        .bitmapText(x, y, "default", col.label, 11)
        .setOrigin(0.5)
        .setTint(0x888888);

      this.add
        .bitmapText(x, y + 20, "default", col.value, 26)
        .setOrigin(0.5)
        .setTint(0xffffff);
    });
  }

  addShareCard() {
    const cardY = 370;
    const cardW = 560;
    const cardH = 110;

    // Card background
    this.add
      .rectangle(this.cx, cardY + cardH / 2, cardW, cardH, 0x111111)
      .setStrokeStyle(1, 0x4fffaa, 0.4);

    this.add
      .bitmapText(this.cx, cardY + 12, "default", "SWAMPFIRE PROTOCOL", 13)
      .setOrigin(0.5)
      .setTint(0x4fffaa);

    const stateLabel = this.state === "victory"
      ? `Escaped Hurricane Kendra in ${this.formatTime(this.elapsed)} with ${this.xp} XP.${this.underTheWire ? ' Under the Wire!' : ''}`
      : this.state === "timeout"
        ? `Survived ${this.formatTime(this.elapsed)} before Hurricane Kendra made landfall.`
        : `Survived ${this.formatTime(this.elapsed)} and earned ${this.xp} XP before going down.`;

    this.add
      .bitmapText(this.cx, cardY + 36, "default", stateLabel, 12)
      .setOrigin(0.5)
      .setTint(0xdddddd)
      .setCenterAlign();

    this.add
      .bitmapText(this.cx, cardY + 68, "default", "[ SHARE CARD -- COPY / DOWNLOAD IN PHASE 6 ]", 10)
      .setOrigin(0.5)
      .setTint(0x444444);
  }

  addRestartPrompt() {
    const label = this.state === "victory"
      ? "PRESS SPACE TO PLAY AGAIN"
      : "PRESS SPACE TO TRY AGAIN";

    const prompt = this.add
      .bitmapText(this.cx, this.h - 36, "default", label, 20)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  loadNext() {
    this.cameras.main.fade(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("splash");
    });
  }
}
