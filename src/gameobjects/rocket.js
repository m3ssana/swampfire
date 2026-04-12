/**
 * Rocket — E-key installable that accepts crafted components and launches when full.
 *
 * 5 visual states (0–4 systems installed), implemented via tint on a single sprite:
 *   0  Grey    — untouched
 *   1  Warm    — first system in
 *   2  Warmer  — halfway there
 *   3  Almost  — one away
 *   4  Gold    — all systems go; pressing E triggers finishScene()
 *
 * Prompt text flips from "[E] Install" to "[E] Launch" after the 4th system.
 * This is re-evaluated on every proximity entry so the text is always fresh.
 */

const TINTS = [0x666666, 0x998877, 0xaabb99, 0xbbddcc, 0xffee44];

export default class Rocket {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x  - World x position
   * @param {number}       y  - World y position
   */
  constructor(scene, x, y) {
    this.scene  = scene;
    this.sprite = scene.matter.add.sprite(x, y, 'rocket_pixel', 0, { isStatic: true });
    this.sprite.setFixedRotation();
    this.sprite.setScale(3);  // Scale to ~96×216 pixels (3× original 32×72)
    this.updateVisual();
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Interactable interface ───────────────────────────────────────────────────

  promptText() {
    const n = this.scene.registry.get('systemsInstalled') ?? 0;
    return n >= 4 ? '[E] Launch' : '[E] Install';
  }

  /**
   * Called when player presses E while this rocket is nearby.
   *
   * - If all 4 systems installed → triggers the win condition.
   * - If a crafted component exists → installs it, increments counter, updates visual.
   * - Otherwise → shows error prompt.
   */
  interact() {
    const n   = this.scene.registry.get('systemsInstalled') ?? 0;
    const inv = this.scene.registry.get('inventory') ?? [];

    // All systems installed — launch! Guard against double-press during cinematic.
    if (n >= 4) {
      if (!this.scene._launching) this.scene.finishScene();
      return;
    }

    // Find and remove the first component from inventory
    let component = null;
    let installed = false;
    const newInv = inv.filter(item => {
      if (!installed && item.type === 'component') {
        installed = true;
        component = item;
        return false;
      }
      return true;
    });

    if (!component) {
      this.scene.showPoints(
        this.sprite.x, this.sprite.y - 40,
        'Craft a component first', 0xff4444
      );
      return;
    }

    // Install the component
    const next = n + 1;
    this.scene.registry.set('inventory', newInv);
    this.scene.registry.set('systemsInstalled', next);
    this.updateVisual();

    // Award XP
    const xp = this.scene.registry.get('xp') ?? 0;
    this.scene.registry.set('xp', xp + 500);

    // Feedback — label popup + XP popup + red flash + zoom bump + shake
    this.scene.showPoints(
      this.sprite.x, this.sprite.y - 40,
      `${component.label} installed`, component.tint ?? 0x4fffaa
    );
    this.scene.showXPGain(this.sprite.x, this.sprite.y - 40, 500, 'install');
    this.scene.cameras.main.flash(200, 0xff, 0x44, 0x22);
    this.scene.cameras.main.shake(180, 0.008);
    // Brief zoom-in to 2.0x then pull back to 1.5x
    const cam = this.scene.cameras.main;
    this.scene.tweens.killTweensOf(cam);
    this.scene.tweens.add({
      targets: cam,
      zoom: 2.0,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => this.scene.tweens.add({
        targets: cam,
        zoom: 1.5,
        duration: 400,
        ease: 'Quad.InOut',
      }),
    });
    this.scene.playAudio('install');
  }

  // ── Visual state ─────────────────────────────────────────────────────────────

  /**
   * Reads systemsInstalled from registry and applies the matching tint.
   * Call after any install to keep sprite in sync.
   */
  updateVisual() {
    const n = this.scene.registry.get('systemsInstalled') ?? 0;
    this.sprite.setTint(TINTS[Math.min(n, 4)]);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  destroy() {
    this.scene?.events.off('shutdown', this.destroy, this);
    this.sprite?.destroy();
    this.sprite = null;
  }
}
