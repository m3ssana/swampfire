import Phaser from "phaser";
import Bootloader from "./scenes/bootloader";
import Outro from "./scenes/outro";
import Splash from "./scenes/splash";
import Transition from "./scenes/transition";
import Game from "./scenes/game";
import HUD from "./scenes/hud";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";

// Pre-size #game-container before Phaser init.
// Without this, #game-container has zero dimensions at startup, causing Phaser's
// Scale Manager to fall back to window.innerWidth/innerHeight.  At 1920×1080 that
// produces a canvas larger than the .cabinet-screen column, which is then clipped
// by .crt-frame's overflow:hidden.  We measure the available area inside
// .cabinet-screen and set an explicit size so Phaser reads the correct bounds.
const GAME_W = 1280;
const GAME_H = 720;

function sizeGameContainer() {
  const screen = document.querySelector(".cabinet-screen");
  const container = document.getElementById("game-container");
  if (!screen || !container) return;
  const { width, height } = screen.getBoundingClientRect();
  const pad = 12; // matches padding: 12px on .cabinet-screen
  const availW = width - pad * 2;
  const availH = height - pad * 2;
  const scale = Math.min(availW / GAME_W, availH / GAME_H);
  container.style.width = `${Math.floor(GAME_W * scale)}px`;
  container.style.height = `${Math.floor(GAME_H * scale)}px`;
}

sizeGameContainer();

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

// Keep the canvas correctly sized on window resize.
// Phaser re-reads #game-container's dimensions on each scale refresh, so we
// must update the inline styles before calling refresh().
window.addEventListener("resize", () => {
  sizeGameContainer();
  game.scale.refresh();
});

// Expose game instance for E2E tests to access state directly
// Tests can access: window.game.scene.scenes[3].registry.get('hp'), etc.
if (typeof window !== 'undefined') {
  window.game = game;
}
