import Dust from "./particle";
import { getWindDrift } from "./storm_phase_logic";

const WALK_SPEED = 3;
const SPRINT_SPEED = 6;

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.label = "player";
    this.invincible = true;
    this.init(x, y);
    this.addControls();
  }

  /*
    Creates a single rectangular Matter body (no sensors -- this is top-down,
    no ground/wall detection needed). Fixed rotation so the sprite never spins.
  */
  init(x, y) {
    this.sprite = this.scene.matter.add.sprite(0, 0, "player", 0);

    const { Bodies } = Phaser.Physics.Matter.Matter;
    const { width: w, height: h } = this.sprite;

    const mainBody = Bodies.rectangle(0, 0, w - 14, h - 10, {
      chamfer: { radius: 10 },
      frictionStatic: 0,
      frictionAir: 0.05,
      friction: 0,
    });

    this.sprite
      .setExistingBody(mainBody)
      .setFixedRotation()
      .setPosition(x, y)
      .setDepth(10); // Always render above tile layers (ground=0, obstacles=1)

    this.addEvents();
    this.addAnimations();
    this.initInvincible();
  }

  /*
    Hook into the scene update loop and scene lifecycle.
  */
  addEvents() {
    this.scene.events.on("update", this.update, this);
    this.scene.events.once("shutdown", this.destroy, this);
    this.scene.events.once("destroy", this.destroy, this);
  }

  /*
    WASD + arrow keys for 4-dir movement. Shift for sprint.
  */
  addControls() {
    this.cursor = this.scene.input.keyboard.createCursorKeys();
    this.W = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.A = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.S = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.D = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.shift = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    );
  }

  addAnimations() {
    this.scene.anims.create({
      key: "playeridle",
      frames: this.scene.anims.generateFrameNumbers(this.label, {
        start: 0,
        end: 1,
      }),
      frameRate: 5,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "playerwalk",
      frames: this.scene.anims.generateFrameNumbers(this.label, {
        start: 0,
        end: 3,
      }),
      frameRate: 6,
      repeat: -1,
    });

    this.sprite.anims.play("playeridle", true);
  }

  /*
    Blink the player on spawn to signal invincibility window.
  */
  initInvincible() {
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.5, to: 1 },
      duration: 200,
      repeat: 10,
      onComplete: () => {
        this.invincible = false;
      },
    });
  }

  /*
    4-directional movement with diagonal normalization and Shift sprint.
    Velocity is set directly each frame so input is tight and responsive.

    Set `player.locked = true` to freeze movement (e.g., during zone transitions).
  */
  update() {
    if (this.locked) {
      this.sprite.setVelocity(0, 0);
      this.sprite.anims.play('playeridle', true);
      return;
    }

    const speed = this.shift.isDown ? SPRINT_SPEED : WALK_SPEED;
    let vx = 0;
    let vy = 0;

    if (this.D.isDown || this.cursor.right.isDown) vx += 1;
    if (this.A.isDown || this.cursor.left.isDown) vx -= 1;
    if (this.S.isDown || this.cursor.down.isDown) vy += 1;
    if (this.W.isDown || this.cursor.up.isDown) vy -= 1;

    // Normalize diagonal movement so speed stays consistent in all directions
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    // Add hurricane wind drift on top of player input (wind blows east, +X)
    const stormPhase = this.scene.registry.get('stormPhase');
    const windDrift = getWindDrift(stormPhase);

    this.sprite.setVelocity(vx * speed + windDrift, vy * speed);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.sprite.anims.play("playerwalk", true);
      // Flip sprite to face horizontal direction; vertical-only movement keeps
      // the last facing direction, which feels natural.
      if (vx < 0) this.sprite.setFlipX(false);
      else if (vx > 0) this.sprite.setFlipX(true);
      this.step();
    } else {
      this.sprite.anims.play("playeridle", true);
    }
  }

  /*
    Clean up event listeners and destroy the Matter body + sprite.
  */
  destroy() {
    this.scene.playAudio("death");
    this.destroyed = true;

    this.scene.events.off("update", this.update, this);
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);

    this.sprite.destroy();
  }

  /*
    Occasional dust puff while moving -- keeps movement feeling physical.
    Spread randomly around the sprite center for top-down perspective.
  */
  step() {
    if (Phaser.Math.Between(0, 5) > 4) {
      this.scene.trailLayer.add(
        new Dust(
          this.scene,
          this.sprite.x + Phaser.Math.Between(-8, 8),
          this.sprite.y + Phaser.Math.Between(-8, 8)
        )
      );
    }
  }

  /*
    Death burst -- scatter dust particles in all directions.
  */
  explosion() {
    Array(Phaser.Math.Between(10, 15))
      .fill(0)
      .forEach(() => {
        new Dust(
          this.scene,
          this.sprite.x + Phaser.Math.Between(-32, 32),
          this.sprite.y + Phaser.Math.Between(-32, 32)
        );
      });
  }
}
