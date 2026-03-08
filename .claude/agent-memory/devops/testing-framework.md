# Comprehensive Game Testing Framework

**Date**: 2026-03-08
**Status**: ✅ Implemented & All Tests Passing (69/69)
**Commit**: `2425e41`

## Overview
Three-tier automated testing strategy ensures code quality across unit, integration, and E2E levels.

## Tier 1: Unit Tests (Fast Pre-Commit Validation)
**Command**: `npm test`
**Duration**: ~600ms
**Test Count**: 47 tests across 2 files

**Test Files**:
1. `tests/game-logic.test.js` - 25 tests
   - Inventory system (add/remove items, counting by type)
   - Crafting recipes (2-ingredient consumption, 4-component sequence)
   - Rocket installation (win condition at 4 systems)
   - Game state transitions (HP loss, XP gain, timer decrement)
   - Loot table validation (weighted random selection)
   - Core gameplay loop (complete win path)

2. `tests/game-scenes.test.js` - 22 tests
   - Registry state management (set/get/snapshot)
   - Event emissions (changedata listeners, key-specific events)
   - State persistence (inventory across multi-step sequences)
   - Game state machines (win/loss condition detection)
   - Crafting & installation tracking
   - Multi-state coordination

## Tier 2: Integration Tests (Included in npm test)
**Built-in to game-scenes.test.js**
**Test Count**: 22 tests
**Key Coverage**:
- Mock registry implementation (Phaser registry simulation)
- Event emitter system (on/off/once/emit)
- State machine transitions
- Multi-step gameplay sequences

## Tier 3: E2E Tests (Browser Automation)
**Command**: `npm run test:e2e`
**Tool**: Playwright (headless Firefox & Chromium)
**Test File**: `tests/game-flow.e2e.js`

**Scenarios**:
1. Core gameplay path: move → search → craft → install → launch
2. Zone transitions: verify inventory persists across zone changes
3. Combat/hazard: HP decrement on enemy contact
4. Timer & game-over: countdown, HUD updates, timeout triggers
5. Post-deployment: automated verification against live URL

**E2E Features**:
- Full game instance with `window.game` access
- State verification via `page.evaluate()`
- Keyboard input simulation
- Gameplay scenario automation
- Performance baseline (30s stability test)

## CI/CD Integration

**Deploy Workflow** (`.github/workflows/deploy.yml`):
```yaml
1. checkout (SHA pinned)
2. setup-node (SHA pinned)
3. npm ci
4. npm test ← NEW: Unit tests run pre-build
5. npm run build
6. Report Build Size (existing)
7. Upload artifact
8. Deploy to Pages
```

**Optional Post-Deployment Workflow** (`.github/workflows/test-deployed.yml`):
- Trigger: After successful deploy
- Runs E2E tests against live https://m3ssana.github.io/swampfire/
- Uploads test report as artifact
- Comments deployment test status

## Configuration Files

1. **vitest.config.js**
   - Environment: jsdom
   - Globals: true
   - Coverage: src/**/*.js (excludes scene files, main.js)

2. **playwright.config.js**
   - Browsers: Chromium, Firefox
   - Timeout: 30s per test
   - Dev server: `npm run dev` on port 8080
   - Artifacts: screenshots, videos, traces on failure
   - Parallel: 2 workers (local), 1 (CI)

3. **src/main.js** (Modified)
   ```javascript
   if (typeof window !== 'undefined') {
     window.game = game;
   }
   ```
   - Exposes game instance for E2E tests
   - Safe guard: checks window exists (Node.js compatibility)

## Dependencies Added

**devDependencies**:
- `@playwright/test@^1.48.2` - E2E test framework
- `jsdom@^28.1.0` - DOM environment for Vitest

**package.json Scripts**:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:debug": "DEBUG=1 playwright test",
  "test:all": "npm run test && npm run test:e2e"
}
```

## Files Modified
- `.github/workflows/deploy.yml` - Added unit test step pre-build
- `src/main.js` - Expose window.game for E2E
- `package.json` - Add test scripts & dev dependencies
- `.gitignore` - Exclude test-results/, playwright-report/, coverage/

## Files Created
- `tests/game-logic.test.js` - Unit tests (25 tests)
- `tests/game-scenes.test.js` - Integration tests (22 tests)
- `tests/game-flow.e2e.js` - E2E tests
- `vitest.config.js` - Vitest configuration
- `playwright.config.js` - Playwright configuration
- `.github/workflows/test-deployed.yml` - Post-deploy E2E workflow

## Test Results (Latest Run)

```
✓ 4 test files
✓ 69 tests passed (47 unit + 22 integration)
✓ 0 failures
✓ Duration: ~600ms

Test breakdown:
  - zone-transition.test.js: 15 tests ✓
  - zone-tilemap-data.test.js: 7 tests ✓
  - game-logic.test.js: 25 tests ✓
  - game-scenes.test.js: 22 tests ✓
```

## Test Execution Order

**Local Development** (fastest loop):
```bash
npm test              # 600ms — pre-commit validation
npm run build         # 2s — verify no build regressions
npm run dev &         # Start dev server
npm run test:e2e      # 30-60s — full gameplay validation
```

**CI/CD Pipeline** (automatic on push):
1. Unit tests (`npm test`) — blocks build if fails
2. Build (`npm run build`) — if tests pass
3. Deploy to Pages — if build succeeds
4. (Optional) E2E tests against live deployment

## Known Limitations & Next Steps

1. **Playwright Limitations**:
   - Cannot directly trigger E-key interactions (uses page.evaluate instead)
   - Real browser input testing would require more complex automation
   - Workaround: Simulate game state directly via registry access

2. **E2E Coverage**:
   - Currently tests game state logic + basic flow
   - Does not fully exercise all enemy/hazard mechanics
   - Could expand with more container search scenarios

3. **Performance Baseline**:
   - 30-second stability test included
   - Could add lighthouse performance metrics
   - Could track bundle size regression

## Usage Guide

**Run all tests locally**:
```bash
npm run test:all
```

**Watch unit tests during development**:
```bash
npm run test:watch
```

**Debug E2E test**:
```bash
npm run test:e2e:debug
```

**Check test coverage** (unit tests only):
```bash
npm test -- --coverage
```

**Verify deployment test**:
```bash
PLAYWRIGHT_BASE_URL=https://m3ssana.github.io/swampfire/ npm run test:e2e
```

## Security Notes

- No credentials stored in test files
- Test artifacts (playwright-report/, test-results/) gitignored
- E2E tests use public deployment URL only
- No sensitive data logged in test output

## Future Enhancements

1. **Test Coverage Reporting**:
   - Add coverage thresholds (e.g., 80% minimum)
   - Generate coverage reports in CI

2. **Performance Monitoring**:
   - Add lighthouse score tracking
   - Monitor bundle size trends
   - Track test execution time

3. **Visual Regression Testing**:
   - Screenshot comparisons for scene rendering
   - HUD display validation

4. **Advanced E2E Scenarios**:
   - Multi-zone pathfinding validation
   - Complex enemy AI interaction
   - Edge case handling (rapid inputs, network lag)
