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
    // Zone tilesets
    this.load.image("swamp-tiles",   "assets/images/swamp-tiles.png");   // Zone 0
    this.load.image("us41-tiles",    "assets/images/us41-tiles.png");    // Zone 1
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
    This loads the audio files: music and sound effects.
    */
  loadAudios() {
    // ── SFX (climb sounds)
    Array(5)
      .fill(0)
      .forEach((_, i) => {
        this.load.audio(`climb${i}`, `assets/sounds/climb${i}.mp3`);
      });

    // ── SFX (events)
    this.load.audio("splash", "assets/sounds/splash.mp3");
    this.load.audio("music", "assets/sounds/music.mp3");
    this.load.audio("jump", "assets/sounds/jump.mp3");
    this.load.audio("bubble", "assets/sounds/bubble.mp3");
    this.load.audio("trap", "assets/sounds/trap.mp3");
    this.load.audio("crash", "assets/sounds/crash.mp3");
    this.load.audio("fireball", "assets/sounds/fireball.mp3");
    this.load.audio("win", "assets/sounds/win.mp3");
    this.load.audio("start", "assets/sounds/start.mp3");
    this.load.audio("death", "assets/sounds/death.mp3");

    // ── Zone music (Phase 5.3a — simple direct playback)
    const zoneNames = ["cypress", "us41", "collier", "conner", "lolhs"];
    zoneNames.forEach((name, i) => {
      this.load.audio(`zone${i}_${name}`, `assets/music/zone${i}_${name}.ogg`);
    });
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
