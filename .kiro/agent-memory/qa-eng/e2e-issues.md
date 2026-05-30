# E2E Test Issues — game-flow.e2e.js

Catalogued during initial review (2026-03-08).

## Critical (Tests Cannot Run)
- **Playwright browser binaries not installed.** Run `npx playwright install` before any E2E run.
- **E2E tests absent from CI.** `deploy.yml` runs `npm test` (vitest only). Add `npm run test:e2e` step.

## Structural Defects

### 1. `keyboard.press` instead of `keyboard.down/up` (line 65)
Phaser movement uses `cursors.X.isDown` — requires key held. `keyboard.press` fires keydown+keyup
immediately. Duration argument passed to `movePlayer` has no effect on key hold time.
All movement assertions in Scenarios 1, 2, 6, 7 are effectively no-ops.
Fix: use `page.keyboard.down(key)` + `page.waitForTimeout(duration)` + `page.keyboard.up(key)`.

### 2. `scenes[3]` hardcoded index in `getGameState` (line 35)
Game scene is currently at index 3 (`[Bootloader, Splash, Transition, Game, HUD, Outro]`).
Adding or reordering scenes silently breaks all state reads with no error message.
Fix: use `window.game.scene.getScene('game')` (scene key is "game").

### 3. `waitForTimeout(500)` arbitrary delay (line 26)
Magic number. Flaky under CI load. Should poll a real readiness signal.
Fix: `waitForFunction(() => window.game?.scene?.getScene('game')?.sys?.settings?.active)`.

### 4. "30 second stability test" will timeout (line 313)
Loop runs for 30000ms; global `timeout` is `30 * 1000`. Setup + teardown overhead = timeout.
Fix: Set `test.setTimeout(45000)` inside that test, or reduce loop duration.

## Test Quality Defects

### 5. Scenario 3 (combat) is not combat testing (line 137)
Directly calls `registry.set('hp', currentHp - 1)` via `page.evaluate()`.
Tests that Phaser's registry API works. Does NOT test enemy collision → damage pipeline.
This scenario needs actual enemy contact or at minimum a game API call that triggers damage.

### 6. Scenario 4 (timer) is not timer testing (line 168)
Directly decrements `timeLeft` 10 times via `page.evaluate()`.
Tests arithmetic. Does NOT test that Phaser's game loop actually fires the timer event.
The `timerExpired` flag is set manually — no actual game-over scene transition verified.

### 7. HUD tests use CSS selectors on a Canvas game (lines 203, 216)
`[class*="timer"]` and `[class*="heart"]` find no DOM elements — Phaser renders to `<canvas>`.
Both tests silently pass the if-check (null) without asserting anything.
Fix: Access HUD via `window.game.scene.getScene('hud')` and read text object values,
or expose HUD state on `window` for testing.

### 8. Scenario 1 doesn't test the core path (line 81)
After moving, only asserts `0 ≤ hp ≤ 3`. No search, craft, or install is verified.
This is effectively a "game doesn't crash" smoke test with a misleading title.

### 9. Scenario 2 doesn't test zone transitions (line 109)
Sets inventory manually, moves within the same zone, checks inventory is still set.
No zone boundary is crossed. Title ("zone transitions preserve inventory") is false advertising.

## Config Issues

### 10. No Playwright browser launch args for WebGL
Phaser 3's WebGL renderer may degrade or fail in headless Chrome without `--use-gl=swiftshader`.
Add to playwright.config.js: `launchOptions: { args: ['--use-gl=swiftshader'] }`.

### 11. No retries configured
Default is 0 retries. For a physics/timing-dependent game, at least 1 retry recommended.
Add `retries: process.env.CI ? 2 : 0` to playwright.config.js.

### 12. Post-deployment tests gated at describe-parse time (line 339)
`if (isProduction)` wraps test registration. Gives 0 tests locally — could hide broken test bodies.
Prefer `test.skip(!isProduction, ...)` to always register tests but conditionally skip them.
