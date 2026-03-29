# QA Engineering Memory — Swampfire

## Project Overview
- Framework: Phaser 3 + Matter.js | Build: Vite | Test: Vitest (unit) + Playwright (E2E)
- Scene order: `[Bootloader, Splash, Transition, Game, HUD, Outro]` → Game is at index 3
- Game scene key: `"game"` — accessible via `window.game.scene.getScene('game')`
- `window.game` is set in `src/main.js` (line 43) after Phaser init

## Test Infrastructure
- Unit tests: `vitest run` → `tests/*.test.js` (201 tests, all green as of task 4.2)
- E2E tests: `playwright test` → `tests/*.e2e.js` — currently can't run (browsers not installed)
- Playwright browsers must be installed separately: `npx playwright install`
- **E2E tests are NOT wired into CI/CD** — `deploy.yml` only runs `npm test` (unit tests)
- Vitest excludes `src/scenes/*.js` from coverage tracking

## Known Issues in E2E Tests (game-flow.e2e.js)
See `e2e-issues.md` for full detail. Key problems:
1. `keyboard.press` used for movement — wrong API, doesn't hold keys for Phaser's `isDown`
2. `scenes[3]` hardcoded index (fragile; prefer `game.scene.getScene('game')`)
3. `waitForTimeout(500)` arbitrary delay in `waitForGameReady` — flaky
4. Scenario 3 & 4 manipulate state directly via `page.evaluate()` — not real game testing
5. HUD tests (timer/hearts) use CSS selectors on a Canvas game — always silently skip
6. "30 second stability test" timeout matches global 30s limit — will timeout regularly

## Vitest Unit Test Quality
- Strong: zone-transition.test.js, zone-tilemap-data.test.js (real logic extracted and tested)
- Weak: game-logic.test.js has several tautological tests (testing JS arithmetic, not game code)

## Phaser Import Boundary — Critical Rule
- `src/gameobjects/zone_manager.js` imports SearchableContainer → DroppedItem → `Phaser.Physics.Matter.Sprite`
- **Never import zone_manager.js (or any src/gameobjects/*.js) directly in Vitest tests** — Phaser is undefined in jsdom
- Exception: pure-logic modules with no Phaser class dependency ARE safe: `storm_phase_logic.js`, `flood_zone.js` (only exports `FLOOD_SPEED_MULTIPLIER` constant + class)
- Pattern: inline constants and logic from source files; add comment "inlined from X.js — keep in sync"

## Hazard System Test Patterns (task 4.2)
- Arrival thresholds use strict `<` (not `<=`): dist < 8 means exactly 8px is NOT arrived
- Sensor sizing tests: inline BODY_RADIUS/SENSOR_RADIUS from source and assert sensor > body
- Damage guard tests: mock `scene.player.invincible`, `cameras.main.flash/shake`, `restartScene`
- Spawn flag idempotency: call `checkPhaseSpawns` multiple times at same phase — expect count=1
- Zone-transition cleanup: `resetFlags()` mirrors `_clearHazards()` in hazard_manager.js
- DO NOT test `Math.random()` range directly — test the formula that uses it (e.g., `MIN + random * (MAX - MIN)`)

## GitHub Issue Dependencies

Use native `addBlockedBy` GraphQL mutations — never text comments — for issue dependencies.
Full pattern is in `.claude/AGENT_INSTRUCTIONS.md` → "GitHub Issue Dependencies" section.

Quick reference:
- Fetch node IDs: `gh api graphql` query with `issue(number: N) { id }` aliases
- Create: `addBlockedBy(input: { issueId: "BLOCKED", blockingIssueId: "BLOCKER" })`
- Verify: query `blockedBy` / `blocking` fields (NOT `trackedInIssues`)
- Remove: `removeBlockedBy` with same input shape

---

## Common Test Authoring Mistakes Found
- Tautological tests: defining `const fn = () => true` then calling it — tests nothing (found in original hazard-logic.test.js)
- Off-by-one in strict boundary: `dist < 6` — exactly 6.0 is false; 5.99 is true
- Inverting assertion for boundary case: `392.01` is 7.99px from 400, which IS `< 8` (arrived)
