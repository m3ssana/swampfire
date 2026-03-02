# UX Game Designer Memory -- Swampfire Protocol

## Project Overview
- **Game:** Swampfire Protocol -- top-down speed scavenger set in Land O' Lakes, FL 34639
- **Engine:** Phaser 3.80+ with Matter.js physics, Vite build system
- **Spec:** `/home/ron/src/swampfire/SPEC.md` (major rewrite 2026-03-01)
- **Target session:** 60 minutes real-time (one sitting, one shot)

## Codebase Origin
- Forked from "Phaser by Example" dungeon platformer by Pello
- Original: side-scrolling dungeon crawler with Matter.js gravity, bubble shooting, procedural rooms
- Transformation required: side-scroll gravity -> top-down (gravity y=0), dungeon rooms -> zone-based open world

## Major Design Revision (2026-03-01)
- Compressed from 72-hour in-game countdown to 60-minute real-time clock
- Reduced from 7 zones to 5 compact zones (removed Starkey Wilderness, merged School+SR-54)
- Simplified crafting: 2 ingredients per recipe (was 4-6), instant craft (no wait time)
- 3HP hearts system replaces health bar; removed stamina entirely (infinite sprint)
- 4 storm phases replace 3-day cycle (Warning/Evacuation/Storm Surge/Landfall)
- Added: XP popups, combo streaks (FRENZY at 5x), near-miss detection, achievement toasts, share cards
- Added systems: FeedbackSystem, ScoreSystem, ProgressTracker, ComboFX, PickupFX, EndRunScreen
- 10-second micro-intro ("FIND. BUILD. LAUNCH.") replaces 30-second narrative intro
- Design philosophy: constant dopamine, every action produces layered audio+visual feedback

## Key Architecture Decisions
- `phaser-matter-collision-plugin` for collision callbacks
- `MatterGravityFixPlugin` patches Matter.Engine._bodiesApplyGravity
- Player compound body with sensors -- adapt for 4-directional top-down
- Scene stacking: GameScene + HUDScene parallel for UI separation
- Zone loading: 1-2 tilemaps, predictive loading based on player velocity direction
- WebGL required for Light2D pipeline and custom shaders
- Near-miss: dual sensor bodies (outer=near-miss trigger, inner=damage hitbox)
- Screen shake governor: max 2 simultaneous, queue/merge extras
- Feedback batching: overlapping XP popups merge into single number

## Real-World Locations (34639) -- 5 Zones
- Zone 0: Cypress Creek Preserve (7,400 acres, Pump Station Rd, home base)
- Zone 1: US-41 / Land O' Lakes Blvd (commercial strip: Harvey's, NAPA, Advance Auto, O'Reilly, Gulf Coast Tractor, RaceTrac)
- Zone 2: Collier Pkwy (Publix, Library/Foundry, Rec Center)
- Zone 3: Conner Preserve (2,980 acres, RC Flying Field, Fire Tower)
- Zone 4: LOLHS + SR-54 corridor (school, Tractor Supply)
- Removed: Starkey Wilderness (too remote for 60-min pacing)

## Performance Notes
- Particle budget: 800 desktop / 400 mobile
- Shader passes: 3 max desktop / 1 mobile
- Active Matter bodies: 200 desktop / 100 mobile
- Zone transitions: < 300ms desktop / < 500ms mobile
- Input-to-feedback latency: < 16ms (1 frame at 60fps)

## Viral/Social Design Patterns
- Death messages = location-specific Florida Man headlines (inherently shareable)
- Share card on every end-of-run (win or lose) with styled stats
- Combo FRENZY (5x) = clip-worthy moment with particle burst + distorted SFX
- Fire tower panoramic = scripted screenshot moment (zoom-out showing hurricane wall)
- Under-the-Wire achievement (launch < 2 min remaining) = peak clutch share moment

## Confirmed Implementation Details (Phase 0-2 done)
- Registry keys: `hp` (0-3), `xp`, `timeLeft` (3600 start), `timerExpired` (bool), `systemsInstalled` (0-4)
- HUD: parallel scene launched from game.js; guards double-launch with `scene.isActive("hud")`
- HUD owns countdown tick via `this.time.addEvent`. Writes `timerExpired=true` when done.
- Game listens for `changedata-timerExpired` event (specific key, not all mutations)
- Registry listener cleanup: `this.events.once("shutdown", () => registry.events.off(...))` pattern
- Transition.js seeds registry (hp=3, xp=0, timeLeft=3600, timerExpired=false) in `loadNext()`
- SPACE-gated cinematic phases via `keyboard.once("keydown-SPACE", callback)`
- Juan spritesheet: `public/assets/images/player.png`, 192×48px, 4 frames × 48×48
  - Frame 0: idle neutral | Frame 1: idle bob | Frame 2: left leg fwd | Frame 3: right leg fwd
  - `playeridle` (frames 0-1, 5fps) | `playerwalk` (frames 0-3, 6fps) | flipX for L/R facing
  - Generator: `scripts/generate-juan-sprite.js` (ESM, pure Node zlib — no npm deps)
- CI fix: removed broken `actions/cache` step placed AFTER build (restored stale dist/ on hits)
- `*:Zone.Identifier` in .gitignore — Windows NTFS metadata files from downloads
- `package.json` has `"type":"module"` — scripts must use `import` not `require`; or rename `.cjs`

## TODO Progress (as of TODO 2.4)
All of Phase 0 + Phase 1 done. Phase 2 complete.
- [x] 2.0 Juan sprite
- [x] 2.1 Searchable containers (loot system, XP-only)
- [x] 2.2 Inventory + Item Pickup
- [x] 2.3 Workbench crafting
- [x] 2.4 Rocket install + win condition

## Phase 2.1 — Searchable Containers (confirmed patterns)
- Container spritesheet: `public/assets/images/container.png`, 96×48px, 2 frames × 48×48
  - Frame 0: closed toolbox | Frame 1: open/searched
  - Generator: `scripts/generate-container-sprite.js` (same ESM+zlib pattern as Juan)
- `SearchableContainer` class: `src/gameobjects/searchable_container.js`
  - Static Matter sprite (isStatic:true, setFixedRotation())
  - `search()` is idempotent — checks `this.searched` guard, sets frame 1, shakes camera (80ms, 0.004)
  - Weighted random loot via `pickLoot()` — iterates table, subtracts weight from roll
  - XP awarded via `registry.set("xp", current + item.xp)` — HUD auto-redraws
  - SFX: `playAudio("coin")` as placeholder (rummage SFX in Phase 5.3)
  - Cleanup: `scene.events.once("shutdown", this.destroy, this)` → scene.restart() resets all containers
- Interact prompt: single `bitmapText` with `setScrollFactor(0)` — camera-fixed to screen bottom
  - Alpha tweened 0↔1 (150ms) via `showInteractPrompt()` / `hideInteractPrompt()`
- Proximity check: runs via `this.events.on("update", ...)` (scene update event, not Phaser's built-in update)
  - RANGE=64px, Euclidean check (dx²+dy² < RANGE²) — only updates prompt on transition, not every frame
  - `nearbyContainer` pointer compared — avoids redundant tween firing
- E-key: `this.input.keyboard.on("keydown-E", this.onEKey, this)` — delegates to `nearbyContainer?.search()`
- All listeners cleaned up in shutdown: `this.events.once("shutdown", () => { keyboard.off; events.off; })`
- 4 containers hardcoded around spawn point (~260 px radius, <7% of zone radius) — intentional Phase 2.1 placeholder
- No respawn timer by design — containers stay open until death/restart
## Phase 2.2 — Inventory + Item Pickup (confirmed patterns)
- Registry key `inventory`: `Array<{ label: string, type: "ingredient"|"junk"|"component" }>`
  - Seeded as `[]` in `transition.loadNext()` alongside hp/xp/timeLeft/timerExpired
  - Persists across deaths (registry lives as long as HUD); cleared on new run
  - `type: "component"` reserved for rocket parts (Phase 2.4)
- `DroppedItem`: `src/gameobjects/dropped_item.js` — mirrors Coin pattern
  - `Phaser.Physics.Matter.Sprite`, `isStatic: true`, `label = 'item'`
  - Texture key `'item_pixel'`: programmatic 16×16 white rounded rect, generated in bootloader
  - Tinted per-item via `setTint(itemDef.tint)` at construction
  - Pulse tween: scaleX/Y 0.9→1.2, 600ms, yoyo, repeat -1, Sine.easeInOut
  - Cleanup: `pulseTween?.stop()` before `super.destroy()`; deregisters shutdown listener
- `generateItemTexture()` in bootloader: called FIRST in `preload()` before `setLoadEvents()`
  - `this.make.graphics({ add: false })` generates texture synchronously (no async needed)
- Two-step loot loop: XP on search (instant dopamine) → item on floor → walk over (tension)
  - "Empty" containers: no DroppedItem spawned, no entry in inventory (guard in both search() and playerPicksItem())
  - Item spawn offset: `Phaser.Math.Between(-30, 30)` on both axes from container center
- `playerPicksItem()` in game.js: reads itemDef, spreads new entry onto inventory array, shows popup, plays audio, destroys sprite
- Loot table `type` field: `"ingredient"` (blue 0x4fc3f7) = crafting materials; `"junk"` (white/grey) = filler/flavor
- **Phase 3 replaces hardcoded placement** (see `docs/ddr/container-placement.md`):
  - Load from Tiled object layer in `zone_manager.js` (type=`"container"`, property `table`)
  - Remove `addWorldObjects()` from `game.js`
  - Target: ~15–20 containers for Zone 0

## Phase 2.3+2.4 — Workbench + Rocket (confirmed patterns)

### Unified Interactable Interface
All world objects implement `interact()` + `promptText()`. game.js stores one pointer:
`this.nearbyInteractable` (was `nearbyContainer`). `checkInteractableProximity()` builds
candidates array `[...unsearched containers, workbench, rocket]`; first within RANGE=72px wins.
`interactPrompt.setText(found.promptText())` called on transition — dynamic text per object.

### Workbench (`src/gameobjects/workbench.js`)
- Consumes 2 `type:"ingredient"` items, produces next in ROCKET_SYSTEMS[totalBuilt]
- `totalBuilt = systemsInstalled + inventory.components.length` — cap at 4
- Awards +15 XP per craft. Camera shake 120ms/0.006.
- Error popups via `scene.showPoints()` with red 0xff4444 tint

### Rocket (`src/gameobjects/rocket.js`)
- 5 tint states: TINTS[0–4] grey→gold via `this.sprite.setTint(TINTS[n])`
- `updateVisual()` called after every install to keep sprite in sync
- promptText() returns "[E] Launch" when n>=4, else "[E] Install"
- Installs consume first `type:"component"` from inventory; awards +20 XP
- n>=4 → calls `scene.finishScene()` → `endRun("victory")`

### Registry addition
- `systemsInstalled` (0–4): seeded in `transition.loadNext()`, updated in `rocket.interact()`
- HUD watches via `onRegistryChange` case `"systemsInstalled"` → `updateSystems(n)`
- `updateSystems`: text turns cyan (0x4fffaa) at 4/4, stays gold (0xffee44) otherwise
- Persists across death/restart within a run; reset only on new run via transition

### Texture generation
- `generateWorkbenchTexture()` + `generateRocketTexture()` in `bootloader.preload()`
- Both called alongside `generateItemTexture()` before `setLoadEvents()`
