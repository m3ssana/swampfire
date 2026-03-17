import DroppedItem from './dropped_item';

/**
 * SearchableContainer — a static, lootable world object.
 *
 * Phase 2.1 scope:
 *   - Frame 0 = closed toolbox, Frame 1 = open/empty
 *   - Player walks into range → game shows "[E] Search" prompt
 *   - Player presses E → subtle camera shake, XP popup, "coin" SFX
 *   - Already-searched containers are skipped (no double-looting)
 *   - Loot yields XP only; item names are present for flavour / Phase 2.2
 *
 * Loot table is weighted random. Weights are relative (not percentages).
 * Total weight: 100 → each entry's probability = weight / 100.
 */

// ── Loot tables ───────────────────────────────────────────────────────────────

const LOOT_TABLES = {
  /**
   * default — general swamp finds; balanced mix of junk and ingredients.
   */
  default: [
    { label: "Copper Wiring",  xp:  5, tint: 0x4fc3f7, weight: 25, type: "ingredient" },
    { label: "Solenoid Valve", xp: 10, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "Hydraulic Seal", xp:  5, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "PVC Coupler",    xp:  3, tint: 0xffffff, weight: 20, type: "junk" },
    { label: "Empty",          xp:  0, tint: 0x666666, weight: 15, type: "junk" },
  ],

  /**
   * toolbox — workshop/hardware items; higher chance of crafting ingredients.
   * Found near workshops, hardware stores, Zone 0 clearing.
   */
  toolbox: [
    { label: "Copper Wiring",    xp: 10, tint: 0x4fc3f7, weight: 25, type: "ingredient" },
    { label: "Solenoid Valve",   xp: 15, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "Steel Bracket",    xp:  8, tint: 0x90a4ae, weight: 20, type: "ingredient" },
    { label: "Wire Stripper",    xp:  3, tint: 0xffd54f, weight: 15, type: "junk" },
    { label: "Duct Tape",        xp:  2, tint: 0xe0e0e0, weight: 12, type: "junk" },
    { label: "Empty",            xp:  0, tint: 0x666666, weight:  8, type: "junk" },
  ],

  /**
   * cooler — food and convenience store supplies.
   * Low ingredient chance; decent XP for morale.
   */
  cooler: [
    { label: "Energy Drink",     xp:  4, tint: 0x76ff03, weight: 30, type: "junk" },
    { label: "Water Bottle",     xp:  2, tint: 0x40c4ff, weight: 25, type: "junk" },
    { label: "Beef Jerky",       xp:  3, tint: 0xa1887f, weight: 20, type: "junk" },
    { label: "Hydraulic Seal",   xp:  5, tint: 0x4fc3f7, weight: 15, type: "ingredient" },
    { label: "PVC Coupler",      xp:  3, tint: 0xffffff, weight:  8, type: "junk" },
    { label: "Empty",            xp:  0, tint: 0x666666, weight:  2, type: "junk" },
  ],

  /**
   * backpack — general scavenge from abandoned bags.
   * Mix of ingredients and personal effects.
   */
  backpack: [
    { label: "Copper Wiring",    xp:  5, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "AA Batteries",     xp:  6, tint: 0xffca28, weight: 20, type: "ingredient" },
    { label: "Multi-tool",       xp:  8, tint: 0x90a4ae, weight: 15, type: "ingredient" },
    { label: "Rain Poncho",      xp:  2, tint: 0xffffff, weight: 15, type: "junk" },
    { label: "Road Flare",       xp:  3, tint: 0xf44336, weight: 15, type: "junk" },
    { label: "Empty",            xp:  0, tint: 0x666666, weight: 15, type: "junk" },
  ],

  /**
   * crate — heavy-duty hardware crate.
   * Higher XP rewards; better chance at rare crafting parts.
   */
  crate: [
    { label: "Hydraulic Seal",   xp: 12, tint: 0x4fc3f7, weight: 25, type: "ingredient" },
    { label: "Steel Bracket",    xp: 10, tint: 0x90a4ae, weight: 20, type: "ingredient" },
    { label: "Pressure Gauge",   xp: 15, tint: 0xff7043, weight: 15, type: "ingredient" },
    { label: "Copper Wiring",    xp:  8, tint: 0x4fc3f7, weight: 15, type: "ingredient" },
    { label: "Bolt Set",         xp:  4, tint: 0xe0e0e0, weight: 15, type: "junk" },
    { label: "Empty",            xp:  0, tint: 0x666666, weight: 10, type: "junk" },
  ],
};

// ── Class ─────────────────────────────────────────────────────────────────────

export default class SearchableContainer {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x         - World x position
   * @param {number}       y         - World y position
   * @param {string}       [tableKey="default"] - Key into LOOT_TABLES
   */
  constructor(scene, x, y, tableKey = "default") {
    this.scene    = scene;
    this.tableKey = tableKey;
    this.searched = false;
    this.sprite   = null;

    this.init(x, y);
  }

  // ── Initialise ──────────────────────────────────────────────────────────────

  init(x, y) {
    // Static Matter sprite — acts as a collidable obstacle in the world
    this.sprite = this.scene.matter.add.sprite(x, y, "container", 0, {
      isStatic: true,
    });
    this.sprite.setFixedRotation();

    // Auto-cleanup when the scene shuts down (scene.restart() triggers this)
    this.scene.events.once("shutdown", this.destroy, this);
  }

  // ── Interactable interface ───────────────────────────────────────────────────

  /** Unified interact() call — delegates to search(). */
  interact()   { this.search(); }

  /** Returns the prompt text shown when the player is in range. */
  promptText() { return '[E] Search'; }

  // ── Search action ───────────────────────────────────────────────────────────

  /**
   * Called when the player presses E while this container is nearby.
   * Idempotent — subsequent calls on an already-searched container are no-ops.
   */
  search() {
    if (this.searched) return;
    this.searched = true;

    // Visual: switch to open-frame sprite
    this.sprite.setFrame(1);

    // Haptic feedback: subtle camera shake
    this.scene.cameras.main.shake(80, 0.004);

    // Pick loot
    const item = this.pickLoot();

    // Item name floater — always shown (even for Empty containers)
    this.scene.showPoints(this.sprite.x, this.sprite.y, item.label, item.tint);

    // Award XP to registry (HUD redraws automatically) + separate XP popup
    if (item.xp > 0) {
      const current = this.scene.registry.get("xp") ?? 0;
      this.scene.registry.set("xp", current + item.xp);
      this.scene.showXPGain(this.sprite.x, this.sprite.y, item.xp, 'loot');
    }

    // Spawn a pickupable DroppedItem at the player's feet (guaranteed reachable).
    // Dropping at the container's position risks landing inside an adjacent wall,
    // tree, water tile, or the container's own physics body — all inaccessible.
    // The player is always standing in passable space (proximity check enforces
    // 72 px range), so their position is the safe anchor. Small jitter ensures
    // multiple items from the same chest don't stack on one pixel.
    // "Empty" loot has no physical item — only XP-less flavour text was shown.
    if (item.label !== 'Empty') {
      const player = this.scene.player?.sprite;
      const dropX  = player
        ? player.x + Phaser.Math.Between(-10, 10)
        : this.sprite.x;
      const dropY  = player
        ? player.y + Phaser.Math.Between(-10, 10)
        : this.sprite.y;
      new DroppedItem(this.scene, dropX, dropY, item);
    }

    // Audio: "coin" SFX as placeholder — proper rummage SFX added in Phase 5.3
    this.scene.playAudio("coin");
  }

  // ── Loot selection ──────────────────────────────────────────────────────────

  /**
   * Picks one loot entry from the table using weighted random selection.
   * @returns {{ label: string, xp: number, tint: number }}
   */
  pickLoot() {
    const table = LOOT_TABLES[this.tableKey] ?? LOOT_TABLES.default;
    const total = table.reduce((sum, e) => sum + e.weight, 0);
    let roll    = Math.random() * total;

    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }

    // Fallback (floating-point safety)
    return table[table.length - 1];
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  destroy() {
    this.scene.events.off("shutdown", this.destroy, this);
    this.sprite?.destroy();
    this.sprite = null;
  }
}
