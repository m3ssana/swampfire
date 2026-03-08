# QA Engineering Memory — Swampfire

## Project Overview
- Framework: Phaser 3 + Matter.js | Build: Vite | Test: Vitest (unit) + Playwright (E2E)
- Scene order: `[Bootloader, Splash, Transition, Game, HUD, Outro]` → Game is at index 3
- Game scene key: `"game"` — accessible via `window.game.scene.getScene('game')`
- `window.game` is set in `src/main.js` (line 43) after Phaser init

## Test Infrastructure
- Unit tests: `vitest run` → `tests/*.test.js` (69 tests, all green)
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
