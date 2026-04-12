/**
 * EndRunScreen (key: "outro")
 *
 * Handles all three end states:
 *   "death"   — HP hit 0. Florida Man headline + stats.
 *   "timeout" — Timer hit 0:00. Hurricane made landfall.
 *   "victory" — All 5 systems installed. Placeholder for Phase 6.
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
    this.state        = data.state        || "death"; // "death" | "timeout" | "victory"
    this.underTheWire = data.underTheWire ?? false;
    this.peakCombo    = data.peakCombo    ?? 0;
    this.frenzyCount  = data.frenzyCount  ?? 0;
    this.zonesVisited = data.zonesVisited ?? 1;
    this.itemsFound   = data.itemsFound   ?? 0;
    this.deathMsg     = null; // set by showDeathScreen() for use in share card
    this._feedbackText = null;
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

    // Random Florida Man headline — stored for share card
    this.deathMsg = Phaser.Utils.Array.GetRandom(DEATH_MESSAGES);
    this.add
      .bitmapText(this.cx, 128, "default", this.deathMsg, 16)
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

    // Rocket progress — 0/5 until Phase 2 wires up system tracking
    const systems = this.registry.get("systemsInstalled") ?? 0;
    this.add
      .bitmapText(this.cx, 148, "default",
        `Juan's rocket sat ${systems}/5 systems complete\nin Cypress Creek Preserve.`, 15)
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
      .bitmapText(this.cx, statsY + 55, "default", `SYSTEMS INSTALLED: ${systems} / 5`, 18)
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

    // Share buttons — [C] COPY IMAGE only when Clipboard API is available
    const canCopy = typeof ClipboardItem !== 'undefined';
    const btnY = cardY + 82;

    if (canCopy) {
      this.add
        .bitmapText(this.cx - 80, btnY, "default", "[C] COPY IMAGE", 10)
        .setOrigin(0.5)
        .setTint(0x4fffaa);
      this.input.keyboard.on("keydown-C", this._copyCard, this);
    }

    this.add
      .bitmapText(canCopy ? this.cx + 80 : this.cx, btnY, "default", "[D] SAVE IMAGE", 10)
      .setOrigin(0.5)
      .setTint(0x4fffaa);

    this.input.keyboard.on("keydown-D", this._downloadCard, this);
  }

  // ─── Share card implementation ───────────────────────────────────────────────

  /*
    Captures the current Phaser frame via renderer.snapshotArea(), then draws a
    640×360 styled card on an offscreen Canvas2D element. Delivers the canvas to
    the callback — called once the snapshot is ready (next frame).
  */
  _buildShareCanvas(callback) {
    const { width, height } = this.sys.game.config;

    this.sys.game.renderer.snapshotArea(0, 0, width, height, (phaserImage) => {
      const W = 640, H = 360;
      const canvas  = document.createElement('canvas');
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background: dark solid matching end state
      ctx.fillStyle = this.state === 'victory' ? '#051a05'
                    : this.state === 'timeout'  ? '#05050a'
                    : '#1a0505';
      ctx.fillRect(0, 0, W, H);

      // Phaser frame composited at reduced opacity for context
      ctx.globalAlpha = 0.45;
      ctx.drawImage(phaserImage, 0, 0, W, H);
      ctx.globalAlpha = 1.0;

      // Dark overlay for text readability
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';

      // ── Header ──
      ctx.font      = 'bold 18px monospace';
      ctx.fillStyle = '#4fffaa';
      ctx.fillText('SWAMPFIRE PROTOCOL', W / 2, 16);

      // ── State line ──
      const stateStr = this.state === 'victory' ? 'JUAN ESCAPES'
                     : this.state === 'timeout'  ? 'HURRICANE KENDRA LANDS'
                     : 'JUAN IS DOWN';
      ctx.font      = 'bold 26px monospace';
      ctx.fillStyle = this.state === 'victory' ? '#4fffaa'
                    : this.state === 'timeout'  ? '#ff6633'
                    : '#ff3333';
      ctx.fillText(stateStr, W / 2, 44);

      // ── Death headline (death state only) ──
      if (this.state === 'death' && this.deathMsg) {
        ctx.font      = '12px monospace';
        ctx.fillStyle = '#dddddd';
        const lines = this.deathMsg.split('\n');
        lines.forEach((line, i) => ctx.fillText(line.trim(), W / 2, 86 + i * 16));
      }

      // ── Divider ──
      ctx.strokeStyle = '#333333';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(60, 136);
      ctx.lineTo(W - 60, 136);
      ctx.stroke();

      // ── Primary stats row ──
      const statsY = 148;
      const statCols = [
        { x: 160, label: 'TIME SURVIVED', value: this.formatTime(this.elapsed) },
        { x: 320, label: 'XP EARNED',     value: String(this.xp) },
        { x: 480, label: 'HP REMAINING',  value: `${this.hp} / 3` },
      ];
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#888888';
      statCols.forEach(({ x, label }) => ctx.fillText(label, x, statsY));
      ctx.font      = 'bold 20px monospace';
      ctx.fillStyle = '#ffffff';
      statCols.forEach(({ x, value }) => ctx.fillText(value, x, statsY + 14));

      // ── Extra stats row ──
      const extY = 218;
      const extraCols = [
        { x: 120, label: 'ITEMS FOUND',              value: String(this.itemsFound) },
        { x: 270, label: 'PEAK COMBO',               value: String(this.peakCombo) },
        { x: 410, label: `FRENZY ×${this.frenzyCount}`, value: String(this.frenzyCount) },
        { x: 550, label: 'ZONES',                    value: `${this.zonesVisited} / 5` },
      ];
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#888888';
      extraCols.forEach(({ x, label }) => ctx.fillText(label, x, extY));
      ctx.font      = 'bold 16px monospace';
      ctx.fillStyle = '#ffffff';
      extraCols.forEach(({ x, value }) => ctx.fillText(value, x, extY + 14));

      // ── Footer ──
      ctx.font      = '11px monospace';
      ctx.fillStyle = '#4fffaa';
      ctx.fillText('#SwampfireProtocol', W / 2, H - 20);

      callback(canvas);
    });
  }

  /*
    Copies the share card to the system clipboard as a PNG image.
    Requires user gesture (keyboard press) and HTTPS.
    Shows "COPIED!" or "COPY FAILED" feedback.
  */
  _copyCard() {
    this._buildShareCanvas((canvas) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { this._showShareFeedback('EXPORT FAILED'); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          this._showShareFeedback('COPIED!');
        } catch (_err) {
          this._showShareFeedback('COPY FAILED');
        }
      }, 'image/png');
    });
  }

  /*
    Downloads the share card as swampfire-run.png.
    Uses canvas.toBlob() + a temporary anchor element.
  */
  _downloadCard() {
    this._buildShareCanvas((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) { this._showShareFeedback('EXPORT FAILED'); return; }
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = 'swampfire-run.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    });
  }

  /*
    Shows brief feedback text that fades out after 1.5s.
    Destroys any prior feedback text before creating a new one.
  */
  _showShareFeedback(msg) {
    this._feedbackText?.destroy();
    const text = this.add
      .bitmapText(this.cx, 358, "default", msg, 14)
      .setOrigin(0.5)
      .setTint(0x4fffaa);
    this._feedbackText = text;

    this.tweens.add({
      targets:  text,
      alpha:    { from: 1, to: 0 },
      duration: 300,
      delay:    1200,
      onComplete: () => {
        if (text?.active) text.destroy();
        if (this._feedbackText === text) this._feedbackText = null;
      },
    });
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
