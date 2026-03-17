import Player                         from "../gameobjects/player";
import ZoneManager, { isZoneDefined } from "../gameobjects/zone_manager";
import StormManager                   from "../gameobjects/storm_manager";
import HazardManager                  from "../gameobjects/hazard_manager";

export default class Game extends Phaser.Scene {
  constructor() {
    super({ key: "game" });
    this.player = null;
  }

  init(data) {
    this.name   = data.name;
    this.number = data.number;
  }

  create() {
    this.width         = this.sys.game.config.width;
    this.height        = this.sys.game.config.height;
    this.center_width  = this.width / 2;
    this.center_height = this.height / 2;

    // Nearest interactable (container / workbench / rocket) in E-key range; null when none
    this.nearbyInteractable = null;

    // Lock flag — true while a zone-transition fade is in progress
    this._transitioning = false;

    this.addMap();
    this.addPlayer();
    this.addCollisions();
    this.addCamera();
    this.addInteractPrompt();
    this.addInputHandlers();
    this.launchHUD();
    this.loadAudios();
    this.listenForGameOver();
    this.stormManager   = new StormManager(this);
    this.hazardManager  = new HazardManager(this);
    // Wire hazard collision handlers now that both player and hazardManager exist
    this.hazardManager.addCollisions(this);
  }

  // ─── Map ───────────────────────────────────────────────────────────────────

  /*
    Loads Zone 0 (Cypress Creek Preserve) via ZoneManager.
    ZoneManager renders the tilemap, sets up physics collision on impassable tiles,
    and spawns all world objects (containers, workbench, rocket) from the Tiled
    object layer. Exposes them as zone.containers, zone.workbench, zone.rocket.
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

  // ─── Interact prompt ───────────────────────────────────────────────────────

  /*
    A single camera-fixed interact label shown when the player is in range of
    an interactable. Text is set dynamically by each object's promptText().
    Alpha is tweened between 0 and 1 so the prompt fades smoothly in/out.
  */
  addInteractPrompt() {
    this.interactPrompt = this.add
      .bitmapText(this.center_width, this.height - 40, "default", "[E]", 16)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setScrollFactor(0)  // fixed to camera — stays at screen bottom
      .setAlpha(0)
      .setDepth(10);
  }

  showInteractPrompt() {
    this.tweens.add({
      targets:  this.interactPrompt,
      alpha:    1,
      duration: 150,
    });
  }

  hideInteractPrompt() {
    this.tweens.add({
      targets:  this.interactPrompt,
      alpha:    0,
      duration: 150,
    });
  }

  // ─── Input handlers ────────────────────────────────────────────────────────

  /*
    Registers the E-key listener and the per-frame proximity check.
    Both are cleaned up on scene shutdown so scene.restart() starts fresh.
  */
  addInputHandlers() {
    this.input.keyboard.on("keydown-E", this.onEKey, this);

    // Both proximity checks run every frame via the scene's update event
    this.events.on("update", this.checkInteractableProximity, this);
    this.events.on("update", this.checkExitZones, this);

    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-E", this.onEKey, this);
      this.events.off("update", this.checkInteractableProximity, this);
      this.events.off("update", this.checkExitZones, this);
    });
  }

  /*
    Called on every E keydown. Delegates to whichever interactable is
    currently highlighted (container, workbench, or rocket).
  */
  onEKey() {
    this.nearbyInteractable?.interact();
  }

  /*
    Per-frame check: finds the nearest eligible interactable within RANGE pixels
    of the player. Priority order: unsearched containers → workbench → rocket.
    Shows/hides and updates the prompt text on any change.
  */
  checkInteractableProximity() {
    if (!this.player?.sprite) return;

    const { x: px, y: py } = this.player.sprite;
    const RANGE = 72;

    const candidates = [
      ...(this.zone.containers ?? []).filter(c => !c.searched),
      this.zone.workbench,
      this.zone.rocket,
    ].filter(Boolean);

    let found = null;
    for (const obj of candidates) {
      const dx = px - obj.sprite.x;
      const dy = py - obj.sprite.y;
      if (dx * dx + dy * dy < RANGE * RANGE) { found = obj; break; }
    }

    // Only update UI when the highlighted interactable changes
    if (found !== this.nearbyInteractable) {
      this.nearbyInteractable = found;
      if (found) {
        this.interactPrompt.setText(found.promptText());
        this.showInteractPrompt();
      } else {
        this.hideInteractPrompt();
      }
    }
  }

  // ─── Game-over routing ─────────────────────────────────────────────────────

  /*
    Listens for the timerExpired flag set by HUDScene when the clock hits 0:00.
    Uses the specific "changedata-timerExpired" event so we don't scan every
    registry mutation. Cleaned up on scene shutdown to prevent ghost listeners.
  */
  listenForGameOver() {
    const onExpired = (parent, value) => {
      if (value === true) this.endRun("timeout");
    };
    this.registry.events.on("changedata-timerExpired", onExpired, this);
    this.events.once("shutdown", () => {
      this.registry.events.off("changedata-timerExpired", onExpired, this);
    });
  }

  /*
    Stop the HUD and transition to the end-run screen with the given state.
  */
  endRun(state) {
    this.scene.stop("hud");
    this.scene.start("outro", { state });
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
    if (gameObjectB.label === "item")     this.playerPicksItem(gameObjectB);
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

  playerPicksItem(itemSprite) {
    const { itemDef } = itemSprite;
    if (!itemDef) return;

    // Append to persistent inventory registry (feed for Phase 2.3 crafting)
    const inv = this.registry.get('inventory') ?? [];
    this.registry.set('inventory', [
      ...inv,
      { label: itemDef.label, type: itemDef.type },
    ]);

    this.showPoints(itemSprite.x, itemSprite.y, `+ ${itemDef.label}`, itemDef.tint);
    this.playAudio('coin');
    itemSprite.destroy();
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
      targets:  text,
      duration: 1000,
      alpha:    { from: 1, to: 0 },
      x: {
        from: text.x + Phaser.Math.Between(-10, 10),
        to:   text.x + Phaser.Math.Between(-40, 40),
      },
      y: { from: text.y - 10, to: text.y - 60 },
      onComplete: () => text.destroy(),
    });
  }

  /*
    Sends a toast message to HUDScene via the shared registry.
    HUDScene listens for changedata-hudToast and renders a centered fade-out label.
    The pipe+timestamp suffix forces re-fire even if the same message repeats.
  */
  showToast(message) {
    this.registry.set('hudToast', `${message}|${Date.now()}`);
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
    this.cameras.main.once("camerafadeoutcomplete", () => {
      if (hp <= 0) {
        this.endRun("death");
      } else {
        this.scene.restart();
      }
    });
  }

  // ─── Zone transitions ───────────────────────────────────────────────────────

  /*
    Per-frame: checks whether the player has walked into any exit zone rectangle.
    Uses a simple AABB overlap test (no physics body needed — exits are logical
    trigger regions, not physical obstacles).

    Skipped during death-restart, game-over, or an in-progress zone transition.
  */
  checkExitZones() {
    if (this._transitioning || !this.player?.sprite) return;

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    for (const exit of (this.zone.exits ?? [])) {
      if (
        px >= exit.x && px <= exit.x + exit.width &&
        py >= exit.y && py <= exit.y + exit.height
      ) {
        this.transitionToZone(exit.targetZone);
        return;
      }
    }
  }

  /*
    Performs the 0.5s fade-out → zone swap → fade-in transition.

    1. Lock: prevents re-entry and freezes player input.
    2. Fade to black (250 ms).
    3. Destroy current zone (tilemap + objects), load target zone,
       reposition player at the correct entry point.
    4. Update camera bounds to new zone size.
    5. Hide interact prompt (stale from old zone).
    6. Fade back in (250 ms), unlock.

    Registry state (inventory, xp, hp, systemsInstalled) is preserved because
    it lives in the Phaser registry — independent of which scene/zone is active.
  */
  transitionToZone(targetZoneId) {
    if (this._transitioning) return;

    // Guard: target zone not yet built (e.g. Zone 2, 3, 4 in later phases)
    if (!isZoneDefined(targetZoneId)) {
      const { x: px, y: py } = this.player.sprite;
      this.showPoints(px, py, 'Road closed — storm ahead', 0xff8800);
      return;
    }
    this._transitioning  = true;
    this.player.locked   = true;           // freeze WASD input
    this.nearbyInteractable = null;
    this.hideInteractPrompt();

    const sourceZoneId = this.zone.currentZoneId;

    this.cameras.main.fade(250, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      // ── Swap zones ──────────────────────────────────────────────────────────
      this.zone.destroyCurrentZone();
      this.zone.loadZone(targetZoneId, sourceZoneId);

      // ── Reposition player ───────────────────────────────────────────────────
      const entry = this.zone.getEntryPoint(sourceZoneId);
      this.player.sprite.setPosition(entry.x, entry.y);
      this.player.sprite.setVelocity(0, 0);

      // ── Update camera to new zone ───────────────────────────────────────────
      const { width, height } = this.zone.getBounds();
      this.cameras.main.setBounds(0, 0, width, height);
      // Camera is already following player.sprite — no need to re-bind.

      // ── Notify hazard manager of new zone ────────────────────────────────────
      this.events.emit('zoneChanged', targetZoneId);

      // ── Fade back in ────────────────────────────────────────────────────────
      this.cameras.main.fadeIn(250, 0, 0, 0);
      // Use a timer rather than camerafadeincomplete — the camera event is
      // unreliable when fades overlap or the scene is busy loading. If it
      // never fires, _transitioning stays true forever and exit zones stop
      // working. 300ms covers the 250ms fade-in plus a small safety margin.
      this.time.delayedCall(300, () => {
        this.player.locked  = false;
        this._transitioning = false;
      });
    });
  }

  /*
    Player completed the run. Stop the HUD then hand off to the end screen.
    Wired to actual win condition in task 1.4.
  */
  finishScene() {
    this.endRun("victory");
  }
}
