/**
 * StashBox — base-camp stash interactable (Zone 0 only)
 *
 * Provides a deposit/withdraw interface for the player to offload items
 * into the stash registry key, freeing inventory slots for more scavenging.
 *
 * Interaction:
 *   E-key while nearby → deposits the last inventory item into the stash.
 *   Withdraw is triggered via a dedicated T-key when near the stash.
 *
 * Follows the shared interactable interface: interact() + promptText().
 * The stash persists across zone transitions via `registry.get('stash')`.
 */

import { toStash, fromStash } from './inventory_logic.js';

export default class StashBox {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x  - World x position
   * @param {number}       y  - World y position
   */
  constructor(scene, x, y) {
    this.scene = scene;

    StashBox._ensureTexture(scene);

    this.sprite = scene.matter.add.sprite(x, y, 'stash_pixel', 0, { isStatic: true });
    this.sprite.setFixedRotation();

    // T-key: withdraw from stash (only active when player is near)
    this._tKeyHandler = this._onTKey.bind(this);
    scene.input.keyboard.on('keydown-T', this._tKeyHandler);

    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Texture generation (idempotent) ──────────────────────────────────────────

  static _ensureTexture(scene) {
    if (scene.textures.exists('stash_pixel')) return;
    const g = scene.make.graphics({ add: false });
    // Draw a crate-like box (brown with darker outline)
    g.fillStyle(0x6b4423, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x8b5e3c, 1);
    g.fillRect(4, 4, 24, 24);
    g.fillStyle(0xffd700, 1);
    g.fillRect(13, 13, 6, 6); // gold lock icon
    g.generateTexture('stash_pixel', 32, 32);
    g.destroy();
  }

  // ── Interactable interface ───────────────────────────────────────────────────

  promptText() {
    const stash = this.scene.registry.get('stash') ?? [];
    const inv   = this.scene.registry.get('inventory') ?? [];
    const parts = [];
    if (inv.length > 0) parts.push('[E] Deposit');
    if (stash.length > 0) parts.push('[T] Withdraw');
    if (parts.length === 0) return '[E] Stash (empty)';
    return parts.join('  ');
  }

  /**
   * E-key interact: deposits the last inventory item into stash.
   */
  interact() {
    const inv   = this.scene.registry.get('inventory') ?? [];
    const stash = this.scene.registry.get('stash') ?? [];
    const zone  = this.scene.zone?.currentZoneId ?? 0;

    if (inv.length === 0) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, 'Nothing to deposit', 0xff8800);
      return;
    }

    const lastIdx = inv.length - 1;
    const result = toStash(inv, stash, lastIdx, zone);

    if (!result.success) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, result.reason === 'not_at_base' ? 'Base camp only' : 'Cannot deposit', 0xff4444);
      return;
    }

    this.scene.registry.set('inventory', result.inventory);
    this.scene.registry.set('stash', result.stash);

    const deposited = inv[lastIdx];
    this.scene.showPoints(this.sprite.x, this.sprite.y - 20, `Stashed: ${deposited.label}`, 0x4fffaa);
    this.scene.cameras.main.shake(60, 0.003);
    this.scene.playAudio('loot');
  }

  // ── T-key: withdraw ──────────────────────────────────────────────────────────

  _onTKey() {
    // Only respond if THIS stash is the currently highlighted interactable
    if (this.scene.nearbyInteractable !== this) return;

    const inv   = this.scene.registry.get('inventory') ?? [];
    const stash = this.scene.registry.get('stash') ?? [];
    const zone  = this.scene.zone?.currentZoneId ?? 0;

    if (stash.length === 0) {
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, 'Stash is empty', 0xff8800);
      return;
    }

    const lastIdx = stash.length - 1;
    const result = fromStash(inv, stash, lastIdx, zone);

    if (!result.success) {
      const msg = result.reason === 'inventory_full' ? 'Inventory full' : 'Cannot withdraw';
      this.scene.showPoints(this.sprite.x, this.sprite.y - 20, msg, 0xff4444);
      return;
    }

    this.scene.registry.set('inventory', result.inventory);
    this.scene.registry.set('stash', result.stash);

    const retrieved = stash[lastIdx];
    this.scene.showPoints(this.sprite.x, this.sprite.y - 20, `Retrieved: ${retrieved.label}`, 0x4fc3f7);
    this.scene.cameras.main.shake(60, 0.003);
    this.scene.playAudio('loot');
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  destroy() {
    this.scene?.input?.keyboard?.off('keydown-T', this._tKeyHandler);
    this.scene?.events?.off('shutdown', this.destroy, this);
    this.sprite?.destroy();
    this.sprite = null;
  }
}
