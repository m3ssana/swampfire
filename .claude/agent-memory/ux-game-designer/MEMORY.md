# UX Game Designer Memory -- Swampfire Protocol

## Project Overview
- **Game:** Swampfire Protocol -- top-down speed scavenger set in Land O' Lakes, FL 34639
- **Engine:** Phaser 3.80+ with Matter.js physics, Vite build system
- **Spec:** `SPEC.md` (major rewrite 2026-03-01)
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

## ⚠️ Concurrent Agent Git Hazard

When two agents run simultaneously and share the same working directory, one agent's
`git checkout main` silently moves HEAD for ALL agents — causing commits to land on
the wrong branch.

**Fix**: always pass `isolation: "worktree"` when spawning subagents that will use git.
This gives each agent its own checkout in a temp directory, fully isolated.

```js
Agent({ subagent_type: "...", isolation: "worktree", prompt: "..." })
```

If worktree isolation isn't used and branches get cross-contaminated, check
`git branch --show-current` before every commit, and `git log --oneline --all --graph`
to see where commits actually landed.

## ⚠️ GitHub Workflow — HUMAN-IN-THE-LOOP (enforced 2026-03-08)
**ALL changes** (features, bug fixes, docs) go through a branch + PR. Nothing direct to main.
- Features: `git checkout -b feature/issue-X-description`
- Bugs:     `git checkout -b fix/issue-X-description`
- Docs:     `git checkout -b docs/issue-X-description`

### Required issue update cadence (MANDATORY — see AGENT_INSTRUCTIONS.md)
1. **Start work** → `gh issue comment N --body "🚧 Starting work..."` immediately — BEFORE writing any code
2. **During work** → comment on meaningful progress milestones (scripts created, tests passing, etc.)
3. **Work complete** → comment with full summary of what was done + QA result
4. **PR ready** → `gh issue comment N --body "📋 PR #N ready for review"`
5. **STOP** — wait for human to approve + merge
6. **After merge** → final `gh issue comment N` with evidence + `gh issue close N --reason completed`

**NEVER skip step 1.** The issue is the paper trail. No silent work.
**NEVER skip step 3.** Even if no PR exists yet, always comment when work is done.
**NEVER run `gh pr merge`**. A human approves + merges.
Branch protection on main requires 1 approving review — GitHub blocks self-merge.

⚠️ **Violation 2026-03-17:** Completed XP Popup System (#9) without a single issue comment until reminded.
Always comment on the issue at the START of work, not just at the end.

### TODO.md update rule (MANDATORY — learned 2026-03-08)
**TODO.md must be committed inside the feature PR — not as a separate step after merge.**
- Stage `TODO.md` alongside the feature files before `git commit`
- Mark the task ✅ with the commit hash in the same commit
- Never leave TODO.md as an unstaged local edit after a merge — it will drift from reality
- Direct pushes to main bypass branch protection and generate a GitHub warning; avoid them

### Definition of Done checklist (per task)
- [ ] Code written and tests passing
- [ ] `TODO.md` updated to ✅ with commit hash — **in the same PR**
- [ ] GitHub issue has progress comments throughout + final evidence comment
- [ ] `gh issue close N --reason completed`
- [ ] PR merged by human

## TODO Progress (as of Phase 4.2 complete)
All of Phase 0–4.2 done. Phase 4.3+ pending.
- [x] 3.4 Zones 2, 3, 4 (commit ff78171)
- [x] 4.1 StormManager (commit b74aa10)
- [x] 4.2 Hazard game objects (commit a2bca80)
- [ ] 4.3 Wind + environmental effects (#8)

## Phase 4.2 — Hazard Game Objects (confirmed patterns)

### Hazard class pattern
Each hazard is self-contained in `src/gameobjects/`. Template:
- Constructor builds sprite (via `_ensureTexture` static), Matter body, sensor.
- `_body.gameObject = this` so collision callback can call `onNearMiss()`.
- Cleanup in `destroy()`: off update listener, `matter.world.remove()`, sprite.destroy().
- Register `scene.events.once('shutdown', this.destroy, this)` in constructor.

### Texture generation pattern
Hazards that use procedural textures call a static `_ensureTexture(scene)` guard:
```js
static _ensureTexture(scene) {
  if (scene.textures.exists('key')) return;
  const g = scene.make.graphics({ add: false });
  // ... draw ...
  g.generateTexture('key', w, h);
  g.destroy();
}
```
This avoids re-generating on every spawn (idempotent, cheap).

### Near-miss sensor pattern (dual body)
- Inner body (e.g. radius=10): `label: 'hazard_hit'`, `isSensor: false` — causes damage
- Outer body (e.g. radius=20): `label: 'hazard_warn'`, `isSensor: true` — triggers warning
- Both added to `matter.world` separately; sensor kept co-located via `Body.setPosition()` each update tick
- `onNearMiss()` debounced with `this._nearPlayer` bool + `time.delayedCall(1500-2000ms, reset)`

### FloodZone velocity scaling approach
FloodZone does NOT modify player.js. Instead it scales the velocity AFTER the player's own
update runs (update listeners fire in registration order). Pattern:
```js
const vx = player.sprite.body.velocity.x * FLOOD_SPEED_MULTIPLIER;
player.sprite.setVelocity(vx, vy);
```
`FLOOD_SPEED_MULTIPLIER = 0.45` — exported so tests can import without Phaser.

### HazardManager orchestration
- Single HazardManager created in game.js `create()`, AFTER StormManager.
- Listens to `registry.events.on('changedata-stormPhase', ...)` and scene `zoneChanged` event.
- `zoneChanged` is emitted by `transitionToZone()` in game.js after zone swap but before fade-in.
- Per-zone spawn flags (`_lootersSpawned`, `_powerLinesSpawned`, `_floodZonesSpawned`) reset on zone change.
- `addCollisions(scene)` registers a single `matterCollision.addOnCollideStart` for all hazard labels.
- Damage routing: all hazard hits → `scene.cameras.main.flash(120, 0xff, 0,0)` + shake(180, 0.012) → `restartScene()`

### Hazard spawn thresholds (timeLeft seconds)
- Phase 2 starts at timeLeft <= 2699s (~45 min left): looters spawn
- Phase 3 starts at timeLeft <= 1799s (~30 min left): power lines + flood zones spawn
- Rattlesnakes: always present in Zone 0 and Zone 3 (no phase condition)

### Collision body labels (for routing in addCollisions)
- `rattlesnake` (hit), `rattlesnake_warn` (near-miss)
- `looter` (hit), `looter_warn` (near-miss)
- `powerline_hit` (hit), `powerline_warn` (near-miss), `powerline_pole` (obstacle, not sensor)

### Zone spatial constants
Zone 0, 1, 2, 3, 4 are all 80×60 tiles × 48px = 3840×2880px world space.

## Phase 3.1 — Zone 0 Tilemap (confirmed patterns)

- **Tileset**: `public/assets/images/swamp-tiles.png` (288×48px, 6 tiles × 48px)
  - GID 1: mud/ground | GID 2: water (impassable) | GID 3: cypress tree (impassable)
  - GID 4: trail/path | GID 5: campfire | GID 6: swamp grass
  - Generator: `scripts/generate-swamp-tiles.js` (ESM pure Node zlib)
- **Tilemap**: `public/assets/maps/zone0.json` (Tiled JSON, 80×60 tiles)
  - Generator: `scripts/generate-zone0.js` — deterministic via seeded RNG
  - DO NOT edit by hand — regenerate with script
- **ZoneManager** now owns world object creation, game.js reads from `zone.containers/workbench/rocket`
- **Object Tiled types**: `container` (prop: table), `workbench`, `rocket`, `spawn`, `exit` (prop: targetZone)
- **Tiled object coords**: top-left corner pixels → add `obj.width/2, obj.height/2` for center
- **Collision**: `obstacleLayer.setCollisionByProperty({impassable:true})` then `matter.world.convertTilemapLayer(obstacleLayer)`
- **Bootloader**: `swamp-tiles` image key, `zone0` tilemap key; load image before tilemap
- **ZoneManager addTilesetImage**: `map.addTilesetImage('swamp', 'swamp-tiles')` — first arg = tileset name in JSON

## Phase 3.4 — Zone 2/3/4 (confirmed patterns)

- **Key files**: `scripts/generate-{collier,conner,lolhs}-tiles.js` → `public/assets/images/{name}-tiles.png`
- **Key files**: `scripts/generate-zone{2,3,4}.js` → `public/assets/maps/zone{N}.json`
- **Zone connections**: Zone1↔Zone2 east (rows 25-35), Zone0↔Zone3 west (rows 26-34), Zone1↔Zone4 south (cols 34-46)
- **Entry point convention**: 4-tile clearance from the border (e.g. col 4 or col 75, not col 0/79)
- **ZONES entryPoints**: key = sourceZoneId arriving FROM. Value = pixel {x,y} in THIS zone.
- **Phaser testability gap**: `zone_manager.js` can't be imported in Vitest — Phaser class inheritance
  at module level throws `ReferenceError: Phaser is not defined`. Mirror ZONES data inline in tests.
- **Test coverage pattern**: for each new zone, test structure + layers + tileset name + spawn +
  exit targetZone + container count + loot table validity + corridor passability + entry point passability

## Phase 3.3 — Zone 1 US-41 Tileset (confirmed patterns)

- **Tileset**: `public/assets/images/us41-tiles.png` (384×48px, 8 tiles × 48px)
  - GID 1: asphalt | GID 2: parking | GID 3: brick wall (impassable) | GID 4: sidewalk
  - GID 5: store floor | GID 6: road stripe | GID 7: grass | GID 8: fence (impassable)
  - Generator: `scripts/generate-us41-tiles.js`
- **Tilemap**: `public/assets/maps/zone1.json` — generated by `scripts/generate-zone1.js`
- **Store buildings**: `buildStore(ground, obstacles, x, y, w, h, entranceSide, offset)`
  - Perimeter wall tiles on obstacle layer; floor tiles on ground layer; entrance gap
  - West-side stores face east (entrance on east wall), east-side stores face west
- **isZoneDefined(id)** exported from zone_manager.js — guards transitions to unbuilt zones
  - Shows "Road closed — storm ahead" instead of crashing
- **Zone 1 exits**: north→0 (active), south→4 (blocked), east→2 (blocked)
- Zone 1 entry points: from Zone 0 = tile(40,5), from Zone 4 = tile(40,54), from Zone 2 = tile(75,30)

## Loot Tables (searchable_container.js)
5 tables: `default`, `toolbox` (hardware), `cooler` (food), `backpack` (mixed), `crate` (rare parts)
Weights are relative (not %). Higher-reward: toolbox/crate. Lower-reward: cooler.

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

## XP Popup System — Phase 5.1 (confirmed patterns)

### Two-popup split (as of 2026-03-17)
Every XP-granting action fires TWO popups — keep them separate:
1. `showPoints(x, y, label, tint)` — item label / action label, 14px, depth 40, drifts ±20px
2. `showXPGain(x, y, amount, context)` — XP number, 18px, depth 50, rises straight with scale pop-in

### `showXPGain` design
- Color map (module-level constants in game.js): `loot=0x44ff88`, `craft=0xffdd00`, `install=0x00eeff`
- Merge window: `XP_MERGE_MS = 400` — same-context rapid grants update the existing popup's text
- `_xpPending` initialized as `{}` in `create()` (not lazily)
- Animation: scale 1.3→1.0 (Back.Out 200ms) + rise y-80 (Quad.Out 1500ms) + fade (500ms delay 1000ms)
- Player flash (`_flashPlayer`, 80ms white tint): fires on `'loot'` and `'craft'` only — install already has heavy shake

### Depth convention
- World objects: 0 (default)
- Item name / error / label popups: 40
- XP number popups: 50
- HUD: top (separate scene)

### `onComplete` guard (REQUIRED)
Always use `if (text?.active) text.destroy()` — Phaser kills sprites on scene restart before tweens fire.
(This was a pre-existing bug in `showPoints` that QA caught; fixed 2026-03-17)

### Callers
- `workbench.js`: `showPoints(label+" crafted!", tint)` + `showXPGain(x, y, recipe.xp, 'craft')`
- `searchable_container.js`: `showPoints(item.label, item.tint)` + `showXPGain(x, y, item.xp, 'loot')` (if xp > 0)
- `rocket.js`: `showPoints(label+" installed", tint)` + `showXPGain(x, y, 20, 'install')`

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
