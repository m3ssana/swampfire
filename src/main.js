import Phaser from "phaser";
import Bootloader from "./scenes/bootloader";
import Outro from "./scenes/outro";
import Splash from "./scenes/splash";
import Transition from "./scenes/transition";
import Game from "./scenes/game";
import HUD from "./scenes/hud";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";

const config = {
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  autoRound: false,
  parent: "game-container",
  physics: {
    default: "matter",
    matter: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin,
        key: "matterCollision",
        mapping: "matterCollision",
      },
    ],
  },
  scene: [Bootloader, Splash, Transition, Game, HUD, Outro],
};

const game = new Phaser.Game(config);

// Expose game instance for E2E tests to access state directly
// Tests can access: window.game.scene.scenes[3].registry.get('hp'), etc.
if (typeof window !== 'undefined') {
  window.game = game;
}
