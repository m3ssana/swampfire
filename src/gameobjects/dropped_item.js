/**
 * DroppedItem — a pickupable world item spawned by SearchableContainer.
 *
 * Mirrors the Coin pattern: static Matter body, scene-registered,
 * cleaned up on shutdown. The collision label 'item' is the dispatch key
 * that game.js uses inside onPlayerCollide().
 *
 * itemDef shape: { label: string, xp: number, tint: number, type: string, weight: number }
 */
export default class DroppedItem extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, itemDef) {
    super(scene.matter.world, x, y, 'item_pixel', 0, { isStatic: true });
    this.scene   = scene;
    this.label   = 'item';   // collision dispatch key used in game.js
    this.itemDef = itemDef;  // { label, xp, tint, type, weight }
    scene.add.existing(this);
    this.setTint(itemDef.tint);
    this.setFixedRotation();

    // Pulse tween — draws the player's eye toward uncollected items
    this.pulseTween = scene.tweens.add({
      targets:  this,
      scaleX:   { from: 0.9, to: 1.2 },
      scaleY:   { from: 0.9, to: 1.2 },
      duration: 600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    scene.events.once('shutdown', this.destroy, this);
  }

  destroy() {
    this.pulseTween?.stop();
    this.pulseTween = null;
    this.scene?.events.off('shutdown', this.destroy, this);
    super.destroy();
  }
}
