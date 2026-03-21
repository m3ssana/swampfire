import Player                         from "../gameobjects/player";
import ZoneManager, { isZoneDefined } from "../gameobjects/zone_manager";
import StormManager                   from "../gameobjects/storm_manager";
import HazardManager                  from "../gameobjects/hazard_manager";
import ComboTracker                   from "../gameobjects/combo_tracker";

// ── XP Popup tuning ───────────────────────────────────────────────────────────
const XP_COLORS = {
  loot:    0x44ff88,  // green  — item found in container
  craft:   0xffdd00,  // gold   — rocket component crafted
  install: 0x00eeff,  // cyan   — component installed on rocket
};
/** ms window in which rapid same-context XP grants merge into one popup */
const XP_MERGE_MS = 400;

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

    // Lock flag — true while the rocket launch cinematic is playing
    this._launching = false;

    // Particle emitter created during the launch cinematic; cleaned up on fade-complete
    this._launchEmitter = null;

    // Pending XP popup map — keyed by context ('loot'|'craft'|'install')
    // Used by showXPGain() to merge rapid same-context grants into one popup
    this._xpPending = {};

    // Zone visit tracking — persists across mid-run deaths via registry
    const seededZones = this.registry.get('visitedZones') ?? [0];
    this._visitedZones = new Set(seededZones);

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
    this.comboTracker   = new ComboTracker(this);
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

    const npcQuests  = this.registry.get('npcQuests') ?? {};
    const activeNpcs = (this.zone.npcs ?? []).filter(npc => {
      // NPC is interactive if their quest isn't done yet
      const config = npc._config;
      return config && !npcQuests[npc._npcId];
    });

    const candidates = [
      ...(this.zone.containers ?? []).filter(c => !c.searched),
      this.zone.workbench,
      this.zone.rocket,
      ...activeNpcs,
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
      if (this._launching) return;
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
  endRun(state, options = {}) {
    const peakCombo    = this.comboTracker?.getPeakCombo()   ?? 0;
    const frenzyCount  = this.comboTracker?.getFrenzyCount() ?? 0;
    const zonesVisited = this._visitedZones?.size            ?? 1;
    const itemsFound   = (this.registry.get('inventory') ?? []).length;

    this.scene.stop("hud");
    this.scene.start("outro", {
      state,
      underTheWire: options.underTheWire ?? false,
      peakCombo,
      frenzyCount,
      zonesVisited,
      itemsFound,
    });
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
    if (gameObjectB.label === "item") this.playerPicksItem(gameObjectB);
    if (!(gameObjectB instanceof Phaser.Tilemaps.Tile)) return;

    const tile = gameObjectB;
    if (tile.properties.isLethal) {
      this.unsubscribePlayerCollide();
      this.restartScene();
    }
  }

  // ─── Pickup handlers ───────────────────────────────────────────────────────

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

  // ─── Floating popups ───────────────────────────────────────────────────────

  /*
    Spawns a floating label at world coordinates (x, y).
    Used for item names, error messages, and system status text.
    For XP numbers use showXPGain() instead.
  */
  showPoints(x, y, label, tint = 0xffffff) {
    const text = this.add
      .bitmapText(x, y - 48, "default", String(label), 14)
      .setDropShadow(1, 2, 0x000000, 0.7)
      .setTint(tint)
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets:  text,
      duration: 1000,
      alpha:    { from: 1, to: 0 },
      x: {
        from: text.x + Phaser.Math.Between(-4, 4),
        to:   text.x + Phaser.Math.Between(-20, 20),
      },
      y: { from: text.y, to: text.y - 50 },
      onComplete: () => { if (text?.active) text.destroy(); },
    });
  }

  /*
    Spawns a large, color-coded XP number popup at world coordinates (x, y).

    Merges with any active same-context popup within XP_MERGE_MS:
    rapid container loots within 400 ms show one accumulating "+25 XP" rather
    than two overlapping "+10 XP" / "+15 XP" labels.

    Plays a brief white-flash on the player sprite for loot and craft moments
    to reinforce the "I got something" feeling without needing audio.

    @param {number} x       - World X of the event source
    @param {number} y       - World Y of the event source
    @param {number} amount  - XP amount gained (ignored if ≤ 0)
    @param {string} context - 'loot' | 'craft' | 'install'
  */
  showXPGain(x, y, amount, context = 'loot') {
    if (amount <= 0) return;

    // Merge with an active same-context popup within the merge window
    const pending = this._xpPending[context];
    if (pending?.text?.active) {
      pending.amount += amount;
      pending.text.setText(`+${pending.amount} XP`);
      pending.timer?.remove();
      pending.timer = this.time.delayedCall(XP_MERGE_MS, () => {
        delete this._xpPending[context];
      });
      return;
    }

    const color = XP_COLORS[context] ?? 0xffffff;
    const popY  = y - 48;

    const text = this.add
      .bitmapText(x, popY, 'default', `+${amount} XP`, 18)
      .setOrigin(0.5)
      .setTint(color)
      .setDropShadow(1, 2, 0x000000, 0.9)
      .setDepth(50)
      .setScale(1.3);

    // Scale pop-in: 1.3 → 1.0 over 200 ms (punchy arrival feel)
    this.tweens.add({
      targets: text, scaleX: 1.0, scaleY: 1.0,
      duration: 200, ease: 'Back.Out',
    });

    // Rise over 1.5 s — ease-out keeps it readable before it escapes upward
    this.tweens.add({
      targets: text, y: popY - 80,
      duration: 1500, ease: 'Quad.Out',
    });

    // Fade out in the final 500 ms (holds full alpha for 1 s first)
    this.tweens.add({
      targets: text, alpha: 0,
      duration: 500, delay: 1000,
      onComplete: () => { if (text?.active) text.destroy(); },
    });

    // White flash on the player for loot and craft — confirms "I got something"
    if (context === 'loot' || context === 'craft') this._flashPlayer();

    // Register as pending so the next rapid grant can merge into this popup
    this._xpPending[context] = {
      amount,
      text,
      timer: this.time.delayedCall(XP_MERGE_MS, () => {
        delete this._xpPending[context];
      }),
    };
  }

  /** Briefly tints the player sprite white (80 ms) to signal XP received. */
  _flashPlayer() {
    if (!this.player?.sprite?.active) return;
    this.player.sprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (this.player?.sprite?.active) this.player.sprite.clearTint();
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
      crash: this.sound.add("crash"),
      death: this.sound.add("death"),
      coin:  this.sound.add("start"),
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

    // Death breaks the combo — streak does not carry into the respawn
    this.comboTracker?.reset();

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
      this._visitedZones.add(targetZoneId);
      this.registry.set('visitedZones', [...this._visitedZones]);

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
    Player completed the run. Plays a ~4-second rocket launch cinematic before
    handing off to the end screen via endRun('victory').

    Sequence:
      t=0      — guard flags, ignition flash + camera shake
      t=100ms  — engine exhaust particle emitter starts
      t=350ms  — camera detaches from player, pans to rocket
      t=700ms  — camera zooms out, rocket ascent tween begins
      t=1000ms — under-the-wire toast (only if timeLeft < 2 min)
      t=2600ms — final rumble shake
      t=3200ms — fade to black → endRun('victory')
  */
  finishScene() {
    // ── Step 1 — Initiate ────────────────────────────────────────────────────
    this._launching = true;
    this.player.locked = true;
    this.nearbyInteractable = null;
    this.hideInteractPrompt();

    const timeLeft = this.registry.get('timeLeft') ?? 0;
    const underTheWire = timeLeft < 120; // < 2 min remaining

    const rocket = this.zone?.rocket?.sprite;

    // ── Step 2 — Ignition flash ──────────────────────────────────────────────
    this.cameras.main.flash(350, 255, 140, 0); // orange ignition flash
    this.cameras.main.shake(300, 0.014);

    // ── Step 3 — Engine particles (t=100ms) ─────────────────────────────────
    this.time.delayedCall(100, () => {
      if (!this.scene?.isActive()) return;
      if (rocket) {
        this._launchEmitter = this.add.particles(rocket.x, rocket.y + 36, 'spark_pixel', {
          speedX: { min: -35, max: 35 },
          speedY: { min: 180, max: 380 },   // downward exhaust (positive Y = down)
          quantity: 5,
          frequency: 25,
          lifespan: 550,
          alpha: { start: 1, end: 0 },
          scale: { start: 2.5, end: 0.4 },
          tint: [0xff8800, 0xffdd00, 0xff4400, 0xffffff, 0xff6600],
        }).setDepth(88);
      }
    });

    // ── Step 4 — Camera detach + pan to rocket (t=350ms) ────────────────────
    this.time.delayedCall(350, () => {
      if (!this.scene?.isActive()) return;
      this.cameras.main.stopFollow();
      if (rocket) {
        this.cameras.main.pan(rocket.x, rocket.y, 500, 'Quad.InOut');
      }
    });

    // ── Step 5 — Zoom out + rocket ascent (t=700ms) ──────────────────────────
    this.time.delayedCall(700, () => {
      if (!this.scene?.isActive()) return;
      this.cameras.main.zoomTo(0.6, 1800, 'Quad.Out');

      if (rocket) {
        this.tweens.add({
          targets: rocket,
          y: rocket.y - 580,
          duration: 2200,
          ease: 'Quad.In',
          onUpdate: () => {
            // Keep exhaust emitter attached to rocket bottom
            if (this._launchEmitter && rocket.active) {
              this._launchEmitter.setPosition(rocket.x, rocket.y + 36);
            }
          },
        });
      }
    });

    // ── Step 6 — Under-the-wire toast (t=1000ms) ─────────────────────────────
    if (underTheWire) {
      this.time.delayedCall(1000, () => {
        if (!this.scene?.isActive()) return;
        this.registry.set('hudToast', `UNDER THE WIRE|${Date.now()}`);
      });
    }

    // ── Step 7 — Final shake (t=2600ms) ──────────────────────────────────────
    this.time.delayedCall(2600, () => {
      if (!this.scene?.isActive()) return;
      this.cameras.main.shake(600, 0.02);
    });

    // ── Step 8 — Fade to black + transition (t=3200ms) ───────────────────────
    this.time.delayedCall(3200, () => {
      if (!this.scene?.isActive()) return;
      this.cameras.main.fade(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this._launchEmitter?.destroy();
        this._launchEmitter = null;
        this.endRun('victory', { underTheWire });
      });
    });
  }
}
