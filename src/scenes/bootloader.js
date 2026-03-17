export default class Bootloader extends Phaser.Scene {
  constructor() {
    super({ key: "bootloader" });
  }

  /*
    Once again we use the Scene `preload` method to call the different methods that will load the game assets.
    */
  preload() {
    this.generateItemTexture();
    this.generateWorkbenchTexture();
    this.generateRocketTexture();
    this.generateRainDropTexture();
    this.createBars();
    this.setLoadEvents();
    this.loadFonts();
    this.loadImages();
    this.loadMaps();
    this.loadAudios();
    this.loadSpritesheets();
  }

  /*
    Programmatically generates a 16×16 white rounded-rect texture used by
    DroppedItem. Runs synchronously before any load events so the key
    'item_pixel' is available immediately when the game scene creates items.
  */
  generateItemTexture() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 16, 16, 3);
    g.generateTexture('item_pixel', 16, 16);
    g.destroy();
  }

  /*
    Programmatically generates a 40×28 brown workbench texture.
    Drawn before asset loads so 'workbench_pixel' is available immediately.
  */
  generateWorkbenchTexture() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x8b5e3c, 1);     // wood brown base
    g.fillRect(0, 0, 40, 28);
    g.fillStyle(0x5a3a1a, 1);     // darker top surface
    g.fillRect(2, 2, 36, 10);
    g.fillStyle(0x3a2a10, 1);     // legs
    g.fillRect(2, 22, 8, 6);
    g.fillRect(30, 22, 8, 6);
    g.generateTexture('workbench_pixel', 40, 28);
    g.destroy();
  }

  /*
    Programmatically generates a 32×72 white rocket texture.
    Drawn before asset loads so 'rocket_pixel' is available immediately.
  */
  generateRocketTexture() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 0, 8, 20, 24, 20);   // nose cone
    g.fillRect(8, 18, 16, 44);               // body
    g.fillTriangle(0, 56, 8, 36, 8, 62);    // left fin
    g.fillTriangle(32, 56, 24, 36, 24, 62); // right fin
    g.fillRect(10, 62, 12, 8);              // nozzle
    g.generateTexture('rocket_pixel', 32, 72);
    g.destroy();
  }

  /*
    Programmatically generates a 2×8 white rain drop texture.
    Drawn before asset loads so 'rain-drop' is available immediately when
    StormManager creates the particle emitter.
  */
  generateRainDropTexture() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 8);
    g.generateTexture('rain-drop', 2, 8);
    g.destroy();
  }

  /*
    As we showed before, this method takes care of the loading bar and the progress bar using load events.
    */
  setLoadEvents() {
    this.load.on(
      "progress",
      function (value) {
        this.progressBar.clear();
        this.progressBar.fillStyle(0x0088aa, 1);
        this.progressBar.fillRect(
          this.cameras.main.width / 4,
          this.cameras.main.height / 2 - 16,
          (this.cameras.main.width / 2) * value,
          16
        );
      },
      this
    );

    // Silently skip missing audio files (Suno tracks not generated yet)
    this.load.on('loaderror', (file) => {
      if (file.type === 'audio') {
        console.warn(`[Bootloader] Skipping missing audio: "${file.key}"`);
      }
    });

    this.load.on(
      "complete",
      () => {
        this.scene.start("splash");
      },
      this
    );
  }

  /*
    The fonts are loaded in this method. We'll call them default. Later we could add other fonts but with the same "default" name in case we want to try different fonts.
    */
  loadFonts() {
    this.load.bitmapFont(
      "default",
      "assets/fonts/pico.png",
      "assets/fonts/pico.xml"
    );
  }

  /*
    This one loads the static images.
    */
  loadImages() {
    this.load.image("pello",       "assets/images/pello_ok.png");
    this.load.image("fireball",    "assets/images/fireball.png");
    this.load.image("block",       "assets/images/block.png");
    this.load.image("seesaw",      "assets/images/seesaw.png");
    this.load.image("bubble",      "assets/images/bubble.png");
    this.load.image("platform",    "assets/images/platform.png");
    // Zone tilesets
    this.load.image("swamp-tiles", "assets/images/swamp-tiles.png"); // Zone 0
    this.load.image("us41-tiles",  "assets/images/us41-tiles.png");  // Zone 1
    this.load.image('collier-tiles', 'assets/images/collier-tiles.png'); // Zone 2
    this.load.image('conner-tiles',  'assets/images/conner-tiles.png');  // Zone 3
    this.load.image('lolhs-tiles',   'assets/images/lolhs-tiles.png');   // Zone 4
  }

  /*
    All zone tilemaps are pre-loaded at startup so transitions are instantaneous.
  */
  loadMaps() {
    this.load.tilemapTiledJSON("zone0", "assets/maps/zone0.json");
    this.load.tilemapTiledJSON("zone1", "assets/maps/zone1.json");
    this.load.tilemapTiledJSON('zone2', 'assets/maps/zone2.json');
    this.load.tilemapTiledJSON('zone3', 'assets/maps/zone3.json');
    this.load.tilemapTiledJSON('zone4', 'assets/maps/zone4.json');
  }

  /*
    Audio loading: legacy SFX (kept until Phase 5.3b replaces them) +
    new Suno music tracks. Missing files are silently skipped via the
    loaderror handler in setLoadEvents().
    */
  loadAudios() {
    // ── Legacy SFX (kept for backward compat) ──────────────────────────────
    this.load.audio("crash",    "assets/sounds/crash.mp3");
    this.load.audio("death",    "assets/sounds/death.mp3");
    this.load.audio("start",    "assets/sounds/start.mp3");  // mapped as 'coin' in game.js

    // ── Legacy menu/transition music (fallback until Suno tracks exist) ────
    this.load.audio("splash",   "assets/sounds/splash.mp3");
    this.load.audio("music",    "assets/sounds/music.mp3");

    // ── Zone base tracks (generated via Suno — SPEC §8.1.2) ─────────────────
    // OGG preferred (gapless looping, no encoder padding). MP3 fallback for
    // Safari which lacks OGG support. Phaser picks the first format the
    // browser can decode.
    this.load.audio("zone_cypress", ["assets/music/zone0_cypress.ogg", "assets/music/zone0_cypress.mp3"]);
    this.load.audio("zone_us41",    ["assets/music/zone1_us41.ogg",    "assets/music/zone1_us41.mp3"]);
    this.load.audio("zone_collier", ["assets/music/zone2_collier.ogg", "assets/music/zone2_collier.mp3"]);
    this.load.audio("zone_conner",  ["assets/music/zone3_conner.ogg",  "assets/music/zone3_conner.mp3"]);
    this.load.audio("zone_lolhs",   ["assets/music/zone4_lolhs.ogg",   "assets/music/zone4_lolhs.mp3"]);

    // ── Storm intensity layers (SPEC §8.1.3) ──────────────────────────────
    this.load.audio("storm_phase1", ["assets/music/storm_phase1.ogg", "assets/music/storm_phase1.mp3"]);
    this.load.audio("storm_phase2", ["assets/music/storm_phase2.ogg", "assets/music/storm_phase2.mp3"]);
    this.load.audio("storm_phase3", ["assets/music/storm_phase3.ogg", "assets/music/storm_phase3.mp3"]);
    this.load.audio("storm_phase4", ["assets/music/storm_phase4.ogg", "assets/music/storm_phase4.mp3"]);

    // ── One-shot stings (SPEC §8.1.4) — MP3 fine here, no looping needed ──
    this.load.audio("menu_theme",    ["assets/music/menu_theme.ogg",    "assets/music/menu_theme.mp3"]);
    this.load.audio("sting_install", ["assets/music/sting_install.ogg", "assets/music/sting_install.mp3"]);
    this.load.audio("sting_launch",  ["assets/music/sting_launch.ogg",  "assets/music/sting_launch.mp3"]);
    this.load.audio("sting_failure", ["assets/music/sting_failure.ogg", "assets/music/sting_failure.mp3"]);
  }

  /*
    This part loads sprite sheets for game objects that need animations or variations.
    */
  loadSpritesheets() {
    this.load.spritesheet("player", "assets/images/player.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("dust", "assets/images/dust.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("coin", "assets/images/coin.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("keys", "assets/images/keys.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("bat", "assets/images/bat.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("wizard", "assets/images/wizard.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("container", "assets/images/container.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  /*
    This one adds the load bar to the scene.
    */
  createBars() {
    this.loadBar = this.add.graphics();
    this.loadBar.fillStyle(0x00aafb, 1);
    this.loadBar.fillRect(
      this.cameras.main.width / 4 - 2,
      this.cameras.main.height / 2 - 18,
      this.cameras.main.width / 2 + 4,
      20
    );
    this.progressBar = this.add.graphics();
  }
}
