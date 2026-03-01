import Player from "../gameobjects/player";
import ZoneManager from "../gameobjects/zone_manager";

export default class Game extends Phaser.Scene {
  constructor() {
    super({ key: "game" });
    this.player = null;
  }

  init(data) {
    this.name = data.name;
    this.number = data.number;
  }

  create() {
    this.width = this.sys.game.config.width;
    this.height = this.sys.game.config.height;
    this.center_width = this.width / 2;
    this.center_height = this.height / 2;

    this.addMap();
    this.addPlayer();
    this.addCollisions();
    this.addCamera();
    this.launchHUD();
    this.loadAudios();
  }

  // ─── Map ───────────────────────────────────────────────────────────────────

  /*
    Loads the current zone via ZoneManager.
    Zone 0 is a blank placeholder (Cypress Creek Preserve).
    Tile content and physics layers will be added in Phase 3.
  */
  addMap() {
    this.zone = new ZoneManager(this);
  }

  // ─── Player ────────────────────────────────────────────────────────────────

  addPlayer() {
    const spawn = this.zone.getSpawnPoint();
    this.trailLayer = this.add.layer();
    this.player = new Player(this, spawn.x, spawn.y, 100);
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  /*
    Launch HUDScene as a parallel scene that renders on top of this one.
    Guard against double-launch on scene restart (the HUD stays alive across
    deaths — the timer should keep ticking when the player respawns).
  */
  launchHUD() {
    if (!this.scene.isActive("hud")) {
      this.scene.launch("hud");
    }
  }

  // ─── Collisions ────────────────────────────────────────────────────────────

  addCollisions() {
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this,
    });

    this.matter.world.on("collisionstart", (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
      });
    });
  }

  onPlayerCollide({ gameObjectA, gameObjectB }) {
    if (!gameObjectB) return;
    if (gameObjectB.label === "coin")     this.playerPicksCoin(gameObjectB);
    if (gameObjectB.label === "keys")     this.playerPicksKey(gameObjectB);
    if (gameObjectB.label === "bat")      this.playerHitsFoe(gameObjectB);
    if (gameObjectB.label === "wizard")   this.playerHitsFoe(gameObjectB);
    if (gameObjectB.label === "fireball") this.playerHitsFoe(gameObjectB);
    if (!(gameObjectB instanceof Phaser.Tilemaps.Tile)) return;

    const tile = gameObjectB;
    if (tile.properties.isLethal) {
      this.unsubscribePlayerCollide();
      this.restartScene();
    }
  }

  // ─── Pickup handlers ───────────────────────────────────────────────────────

  playerPicksCoin(coin) {
    this.showPoints(coin.x, coin.y, "+1 XP");
    coin.destroy();
    this.playAudio("coin");
  }

  playerPicksKey(key) {
    this.showPoints(key.x, key.y, "+KEY");
    key.destroy();
  }

  playerHitsFoe(foe) {
    if (this.player.invincible) return;
    this.player.explosion();
    foe.destroy();
    this.restartScene();
  }

  // ─── Floating XP popup ─────────────────────────────────────────────────────

  /*
    Spawns a floating text label at world coordinates (x, y).
    Used for XP gains, pickups, and future combat feedback.
  */
  showPoints(x, y, label, tint = 0xffffff) {
    const text = this.add
      .bitmapText(x + 20, y - 80, "default", String(label), 10)
      .setDropShadow(2, 3, tint, 0.7)
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      duration: 1000,
      alpha: { from: 1, to: 0 },
      x: {
        from: text.x + Phaser.Math.Between(-10, 10),
        to: text.x + Phaser.Math.Between(-40, 40),
      },
      y: { from: text.y - 10, to: text.y - 60 },
      onComplete: () => text.destroy(),
    });
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  addCamera() {
    const { width, height } = this.zone.getBounds();
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);
    this.cameras.main.setBackgroundColor(0x1a2e1a); // dark swamp green
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────

  loadAudios() {
    this.audios = {
      crash:    this.sound.add("crash"),
      fireball: this.sound.add("fireball"),
      death:    this.sound.add("death"),
      coin:     this.sound.add("start"),
    };
  }

  playAudio(key) {
    this.audios[key].play();
  }

  // ─── Scene transitions ─────────────────────────────────────────────────────

  /*
    Player took a hit. Decrement HP in registry (HUD redraws automatically),
    then restart the game scene. The HUD stays alive — the clock keeps ticking.
  */
  restartScene() {
    const hp = Math.max(0, (this.registry.get("hp") ?? 1) - 1);
    this.registry.set("hp", hp);

    this.player.sprite.visible = false;
    this.cameras.main.shake(100);
    this.cameras.main.fade(250, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.restart());
  }

  /*
    Player completed the run. Stop the HUD then hand off to the end screen.
    Wired to actual win condition in task 1.4.
  */
  finishScene() {
    this.scene.stop("hud");
    this.cameras.main.fade(250, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("outro", {
        next: "swampfire",
        name: "ZONE",
        number: this.number + 1,
      });
    });
  }
}
