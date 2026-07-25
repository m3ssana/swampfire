# QA Engineering Memory — Swampfire

## Project Overview
- Framework: Phaser 3 + Matter.js | Build: Vite | Test: Vitest (unit) + Playwright (E2E)
- Scene order: `[Bootloader, Splash, Transition, Game, HUD, Outro]` → Game is at index 3
- Game scene key: `"game"` — accessible via `window.game.scene.getScene('game')`
- `window.game` is set in `src/main.js` (line 43) after Phaser init

## Test Infrastructure
- Unit tests: `vitest run` → `tests/*.test.js` (391 tests as of PRs #133/#134 merge, all green)
- E2E tests: `playwright test` → `tests/*.e2e.js` (13 tests, all pass after `npx playwright install chromium`)
- Playwright browsers must be installed separately: `npx playwright install chromium`
- `node_modules` may be absent after a fresh clone/pull — run `npm install` before any test run
- **E2E tests are NOT wired into CI/CD** — `deploy.yml` only runs `npm test` (unit tests)
- Vitest excludes `src/scenes/*.js` from coverage tracking

## ⚠️ `npm run build` prints "Done" even when it FAILS
Confirmed 2026-07-24. The build script is `vite build --config vite/config.prod.mjs`, and
`✨ Done ✨` is emitted before rollup reports a parse error. Grepping output for "Done" will
report a green build on genuinely broken source.

**Always check the exit code, never the output text.** In PowerShell a pipeline clobbers
`$LASTEXITCODE`, so redirect instead of piping:
```powershell
npm run build *> build.log
if ($LASTEXITCODE -ne 0) { "BUILD FAILED" }
```
Verified: exit 1 on a syntax error, exit 0 when clean.

## ⚠️ A syntactically broken scene file passes `npm test`
Because Vitest never imports `src/scenes/*.js` or Phaser-extending game objects, a missing
brace in `hud.js` or `game.js` is invisible to the entire 700+ test unit suite. Unit tests
are NOT a syntax gate for scene files. Use `npm run build` (exit code) or
`npx esbuild <file> --outfile=<tmp>` to parse-check scene files directly.

## ⚠️ Merge-marker stripping drops factored-out closing braces
When two branches insert new methods at the same location in a class, git factors the
trailing `}` of the preceding method out of the conflict region as a common suffix.
Resolving by deleting only the `<<<<<<<` / `=======` / `>>>>>>>` lines then leaves the file
one `}` short and silently merges two method bodies. After any keep-both resolution inside
a class body, parse-check the file and compare `{` / `}` counts.

## ⚠️ Stale Inlined Constants Risk
- `npc-logic.test.js` inlines `NPC_CONFIGS` but was not updated when PR #133 changed quest reward XP from 30/40/35 → 200 for all NPCs. Tests still passed because assertions use `NPC_CONFIGS.harvey.quest.reward.xp` (self-referential), not the literal source value.
- The `// inlined from X.js — keep in sync` comment is the only enforcement — it is **not machine-checked**.
- When inlining constants: always use the literal value in at least one assertion so a sync failure causes a real test failure. Never write `expect(INLINED_CONST).toBe(INLINED_CONST)` — that tests nothing.

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
Full pattern is in `.kiro/steering/agent-instructions.md` → "GitHub Issue Dependencies" section.

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
