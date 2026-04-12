# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Bug Reports

When a bug is reported:

1. **Create a GitHub issue** — label `type:bug`, include reproduction steps and expected vs actual behavior
2. **Add a TODO.md item** — place it under the appropriate phase with a `(bug #<issue>)` reference and mark it ⏳

## Feature Requests

When a new feature is requested:

1. **Update SPEC.md** — add or revise the relevant section to document the feature's design, behavior, and acceptance criteria
2. **Create a GitHub issue** — label `type:user-story`, write it as a user story with acceptance criteria
3. **Add a TODO.md item** — place it under the appropriate phase (or create a new phase), reference the issue number, mark it ⏳, and prioritize it relative to existing items

## Project Hygiene Checklist

After completing any feature or bug fix, run through this checklist:

1. **Update TODO.md** — mark completed items, add any follow-up tasks discovered during the work
2. **Update/close related GitHub issues** — comment with what was done and close if fully resolved
3. **Verify the build runs without errors** — `pnpm run build` or open `index.html` and check the browser console
4. **Commit all changed files** — don't leave uncommitted work; use a clear commit message referencing the issue number

Invoke `/hygiene` to run through this checklist interactively after finishing a task.

---

## Commands

```bash
npm run dev          # Dev server on localhost:8080
npm run build        # Production build (Terser, Phaser chunk split)
npm test             # Run all unit tests once
npm run test:watch   # Unit tests in watch mode
npm test -- <file>   # Run a single test file, e.g.: npm test -- storm_phase_logic.test.js
npm run test:e2e     # Playwright E2E tests (requires dev server running)
npm run test:all     # Unit + E2E sequentially
```

E2E tests require Playwright browsers: `npx playwright install chromium`

## Architecture

### Scene Stack

The game runs six scenes registered in order in `src/main.js`:

```
Bootloader → Splash → Transition → Game (+ HUD in parallel) → Outro
```

- **Bootloader** — preloads all assets (5 zone tilemaps, tilesets, spritesheets, audio) and generates procedural textures (`item_pixel`, `workbench_pixel`, `rocket_pixel`, `rain-drop`) before handing off to Splash.
- **Transition** — the pre-game cinematic that also **seeds the registry** with a fresh game state (`hp=3, xp=0, timeLeft=3600, inventory=[], systemsInstalled=0`, etc.). All game state lives in the registry — resetting the run means re-running Transition.
- **Game** — the main scene. Owns zone loading, player, camera, XP popups, interact prompt, and the launch cinematic. Launches **HUD** as a parallel scene via `scene.launch("hud")`.
- **HUD** — owns the countdown timer (decrements `registry.timeLeft` every real second). Communicates with Game exclusively through the Phaser registry.
- **Outro** — reads final state from the registry to render the death/timeout/victory screen and generate the share card.

### Cross-Scene State: Phaser Registry

All persistent state is stored in the Phaser global registry (`this.registry` / `scene.registry`). No module-level globals. Key registry keys:

| Key | Init | Owned by |
|-----|------|----------|
| `hp` | 3 | Game (decrement on hit) |
| `xp` | 0 | Game objects (increment) |
| `timeLeft` | 3600 | HUD (decrement each second) |
| `timerExpired` | false | HUD (set true at zero) |
| `inventory` | `[]` | Containers/Workbench/Rocket (push/splice) |
| `systemsInstalled` | 0 | Rocket (increment) |
| `stormPhase` | 1 | StormManager (set on transition) |
| `npcQuests` | `{ harvey, maria, dale, reeves: false }` | NPC (set true on completion) |
| `visitedZones` | `[0]` | Game (push on zone enter) |
| `hudToast` | — | Game (trigger HUD toast) |
| `achievementToast` | — | AchievementManager (trigger HUD toast) |

Listen to specific keys only: `registry.events.on('changedata-<key>', cb)`. Clean up in `scene.events.once('shutdown', ...)`.

### Zone System

`src/gameobjects/zone_manager.js` handles all zone I/O.

- 5 zones (0 = Cypress Creek, 1 = US-41, 2 = Collier Pkwy, 3 = Conner Preserve, 4 = LOLHS/SR-54). All tilemaps pre-loaded by Bootloader so transitions are instant.
- Each zone is a Tiled JSON map with two tile layers (`ground`, `obstacles`) and one object layer. The object layer drives everything: `container`, `workbench`, `rocket`, `npc`, `spawn`, and `exit` (with `targetZone` property) objects are all spawned from it.
- `ZONES[id].entryPoints` maps `sourceZoneId → {x, y}` pixel coordinates. When entering zone N from zone M, the player materialises at `ZONES[N].entryPoints[M]`.
- After a zone swap, `ZoneManager` exposes: `containers[]`, `workbench`, `rocket`, `exits[]`, `currentZoneId`.

**Adding a new zone:** add a config entry to `ZONES`, create `public/assets/maps/zoneN.json` (use `scripts/generate-zoneN.js` as a template), add the tileset image, register both in `Bootloader.preload()`.

### Interactable Interface

All world objects the player can activate with **E** implement two methods:

```js
promptText() → string   // shown in the bottom-center interact prompt
interact()   → void     // called when E is pressed while in range
```

Implementors: `SearchableContainer`, `Workbench`, `Rocket`, `NPC`. Game.js maintains a single `this.nearbyInteractable` pointer, updated each frame via proximity check (72 px Euclidean). Rapid E-presses are safe — each class guards its own idempotency.

### Storm & Hazard Systems

`StormPhaseLogic` (`src/gameobjects/storm_phase_logic.js`) is a **pure module** (no Phaser dependency) — safe to import in Vitest tests directly.

- `getPhaseForTimeLeft(seconds)` → 1–4
- Phase boundaries: 3600–2701 = 1, 2700–1801 = 2, 1800–901 = 3, 900–0 = 4
- `getWindDrift(phase)` → 0 / 0 / 0.8 / 1.5 px/frame

`StormManager` owns particle emitters (rain, debris), the darkness overlay, and phase-transition effects (toast, flash, shake). It reacts to `registry.stormPhase` changes.

`HazardManager` spawns hazard objects per zone + phase: Rattlesnakes (zones 0/3, always), Looters (zone 1, phase ≥ 2), PowerLines + FloodZones (zone 1, phase ≥ 3). Each hazard has a dual Matter body: inner = damage hitbox, outer sensor = near-miss warning.

### Asset Generation

Tilesets and tilemaps are **generated by scripts**, not hand-authored. Run the relevant script whenever you need to regenerate:

```bash
node scripts/generate-zone0.js      # → public/assets/maps/zone0.json
node scripts/generate-swamp-tiles.js # → public/assets/images/swamp-tiles.png
node scripts/generate-juan-sprite.js # → public/assets/images/player.png
```

Scripts use ESM (`import`) and pure Node.js (no npm dependencies beyond zlib). Do not edit the output files by hand.

### Test-Driven Development

**This project uses TDD. Tests are written before implementation — always.**

The workflow for every feature or bug fix:

1. **Read the SPEC** — identify the acceptance criteria for what you're building
2. **Write failing tests first** — unit tests for pure logic, E2E stubs for Phaser-dependent behaviour
3. **Verify tests fail** — a test that passes before implementation tests nothing
4. **Implement** — write the minimum code to make the tests pass
5. **Refactor** — clean up with tests as the safety net

**qa-eng writes the failing tests. The implementing agent makes them pass.**
When a feature spans both agents, qa-eng opens a test PR first; the feature PR merges after.

For pure-logic systems (storm phases, XP values, loot tables, hazard thresholds):
- Extract logic to a standalone module with no Phaser imports
- Write Vitest unit tests against that module before writing any Phaser-dependent code
- The extracted module IS the spec contract — tests lock its behaviour

For Phaser-dependent behaviour (scenes, game objects, cameras):
- Write Playwright E2E stubs that describe the expected player-facing outcome
- These stubs fail or skip until the implementation is complete
- Scene-level unit tests use the mock-registry pattern (see `tests/game-scenes.test.js`)

### Testing Constraints

**Never import `src/gameobjects/*.js` or `src/scenes/*.js` directly in Vitest tests.** These files extend Phaser classes, which throws `ReferenceError: Phaser is not defined` in jsdom. Instead:

- Import pure-logic modules (`storm_phase_logic.js`, the `FLOOD_SPEED_MULTIPLIER` constant from `flood_zone.js`, etc.) — these are safe.
- For everything else, inline the constants or logic under test with a comment: `// inlined from X.js — keep in sync`.
- Scene-level behaviour is covered by Playwright E2E tests, not unit tests.
