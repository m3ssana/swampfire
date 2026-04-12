/**
 * Workbench — E-key craftable that converts 2 ingredients into a rocket component.
 *
 * Recipe sequence is fixed (ROCKET_SYSTEMS order). Each craft:
 *   - Consumes 2 ingredients from the inventory registry
 *   - Produces the next uncrafted component (based on installed + crafted count)
 *   - Awards XP and triggers camera shake + audio feedback
 *
 * Guards:
 *   - Requires exactly ≥2 ingredients; shows error if fewer
 *   - No-ops if all 4 systems are already built (installed + crafted ≥ 4)
 */

const ROCKET_SYSTEMS = [
  { label: 'Fuel Injector',      xp: 15, tint: 0xff6600 },
  { label: 'Oxidizer Tank',      xp: 15, tint: 0x00ccff },
  { label: 'Avionics Board',     xp: 15, tint: 0x00ff88 },
  { label: 'Battery Array',      xp: 15, tint: 0xffee00 },
  { label: 'Pressure Regulator', xp: 15, tint: 0xff44aa },
];

export default class Workbench {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x  - World x position
   * @param {number}       y  - World y position
   */
  constructor(scene, x, y) {
    this.scene  = scene;
    this.sprite = scene.matter.add.sprite(x, y, 'workbench_pixel', 0, { isStatic: true });
    this.sprite.setFixedRotation();
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Interactable interface ───────────────────────────────────────────────────

  promptText() { return '[E] Craft'; }

  /**
   * Called when player presses E while this workbench is nearby.
   * Consumes 2 ingredients → produces the next rocket component.
   */
  interact() {
    const inv        = this.scene.registry.get('inventory') ?? [];
    const installed  = this.scene.registry.get('systemsInstalled') ?? 0;
    const crafted    = inv.filter(i => i.type === 'component').length;
    const totalBuilt = installed + crafted;

    // All 5 systems already accounted for — nothing left to build
    if (totalBuilt >= 5) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, 'All systems built!', 0x888888);
      return;
    }

    // Not enough ingredients
    const ingredients = inv.filter(i => i.type === 'ingredient');
    if (ingredients.length < 2) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, 'Need 2 ingredients', 0xff4444);
      return;
    }

    // Consume 2 ingredients from inventory
    let consumed = 0;
    const newInv = inv.filter(item => {
      if (consumed < 2 && item.type === 'ingredient') { consumed++; return false; }
      return true;
    });

    // Produce the next rocket component in sequence
    const recipe = ROCKET_SYSTEMS[totalBuilt];
    newInv.push({ label: recipe.label, type: 'component', tint: recipe.tint });
    this.scene.registry.set('inventory', newInv);

    // Award XP
    const xp = this.scene.registry.get('xp') ?? 0;
    this.scene.registry.set('xp', xp + recipe.xp);

    // Signal AchievementManager — first_craft and subsequent craft milestones
    const cc = (this.scene.registry.get('craftCount') ?? 0) + 1;
    this.scene.registry.set('craftCount', cc);

    // Feedback — label popup + separate XP popup
    this.scene.showPoints(
      this.sprite.x, this.sprite.y - 20,
      `${recipe.label} crafted!`, recipe.tint
    );
    this.scene.showXPGain(this.sprite.x, this.sprite.y - 20, recipe.xp, 'craft');
    this.scene.cameras.main.shake(120, 0.006);
    this.scene.playAudio('craft');
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  destroy() {
    this.scene?.events.off('shutdown', this.destroy, this);
    this.sprite?.destroy();
    this.sprite = null;
  }
}
