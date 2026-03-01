# Swampfire Protocol

> "What do you mean the hurricane is in 60 minutes?! I haven't even found the fuel injector yet!"
> — Juan, probably

A hurricane hits in 60 minutes. Juan has a half-built rocket in the swamp. Scavenge the real streets of Land O' Lakes, FL 34639 for parts, slam them together, and launch before the storm erases everything -- in one breathless hour.

No pressure. Well, actually, a lot of pressure. Like, hurricane-force pressure. Literally.

**Play it now:** <a href="https://m3ssana.github.io/swampfire/" target="_blank">https://m3ssana.github.io/swampfire/</a>

*(Fair warning: if you fail, Juan gets hurricane'd. No pressure. Again, literally.)*

## Why Florida?

Because if you're going to build a rocket in a swamp with 60 minutes before a category-whatever hurricane, you're doing it in Florida. This is just how things work there. The alligators are used to it.

## Tech Stack

- [Phaser 3.80+](https://phaser.io/) with Matter.js physics — because Juan's rocket obeys the laws of physics (unlike Juan's life choices)
- [Vite](https://vitejs.dev/) build system — fast like the wind, which is unfortunately also currently 120mph
- Deployed to GitHub Pages — so Juan's story lives on even if Juan doesn't

## Development

```bash
npm install        # install dependencies (not rocket parts, sadly)
npm run dev        # launch dev server (not the actual rocket, that's Juan's job)
```

## Build

```bash
npm run build      # build the project. Juan still has to build the rocket himself.
```

## Origin

Forked from the "Dungeon Bobble" example in [Phaser by Example](https://github.com/phaserjs/phaser-by-example) by Pello. Being incrementally refactored into a top-down speed scavenger game where a man builds a rocket in a Florida swamp against a hurricane timer, which is a sentence that has never been typed before in the history of software development.

See [TODO.md](TODO.md) for progress. (Spoiler: Juan is still in the swamp.)

## Reference Links

- [phaser-matter-collision-plugin docs](https://mikewesthad.github.io/phaser-matter-collision-plugin/docs/)
- [Bitmap font generator (snowb)](https://snowb.org/)
- [Modular game worlds in Phaser 3 - Tilemaps](https://itnext.io/modular-game-worlds-in-phaser-3-tilemaps-3-procedural-dungeon-3bc19b841cd)
- [Matter.js moving platforms](https://blog.ourcade.co/posts/2020/phaser-3-matter-physics-moving-platforms/)
- [PhysicsEditor for Phaser 3 + Matter.js](https://www.codeandweb.com/physicseditor/tutorials/how-to-create-physics-shapes-for-phaser-3-and-matterjs)
