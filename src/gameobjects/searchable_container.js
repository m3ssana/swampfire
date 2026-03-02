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
  default: [
    { label: "Copper Wiring",  xp:  5, tint: 0x4fc3f7, weight: 25, type: "ingredient" },
    { label: "Solenoid Valve", xp: 10, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "Hydraulic Seal", xp:  5, tint: 0x4fc3f7, weight: 20, type: "ingredient" },
    { label: "PVC Coupler",    xp:  3, tint: 0xffffff, weight: 20, type: "junk" },
    { label: "Empty",          xp:  0, tint: 0x666666, weight: 15, type: "junk" },
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

    // Floating XP popup — reuses game.showPoints()
    const popupLabel = item.xp > 0
      ? `${item.label}  +${item.xp} XP`
      : item.label;

    this.scene.showPoints(this.sprite.x, this.sprite.y, popupLabel, item.tint);

    // Award XP to registry (HUD redraws automatically)
    if (item.xp > 0) {
      const current = this.scene.registry.get("xp") ?? 0;
      this.scene.registry.set("xp", current + item.xp);
    }

    // Spawn a pickupable DroppedItem at a small random offset from the container.
    // "Empty" loot has no physical item — only XP-less flavour text was shown.
    if (item.label !== 'Empty') {
      const ox = Phaser.Math.Between(-30, 30);
      const oy = Phaser.Math.Between(-30, 30);
      new DroppedItem(this.scene, this.sprite.x + ox, this.sprite.y + oy, item);
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
