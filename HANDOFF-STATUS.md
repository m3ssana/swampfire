# Handoff Status — 2026-07-24

> Scratch note, **not committed** (untracked). Delete it when you're done.
> Everything below was verified by running it, not assumed.

---

## Where things stand in one sentence

Eight PRs are open, all mergeable, all green. **Nothing is merged and no issues are closed** — that's your job. There is **one design decision** waiting on you (#147).

---

## What you need to do next

### 1. Make one decision (#147)

I had to pick a direction to break an inventory softlock, so flagging it: **junk items no longer occupy inventory slots.** They still award XP and show the pickup popup, but never enter the 8-slot array. This follows SPEC §4.4 — *"player only manually decides on components and materials"* — and it's what makes the softlock impossible.

This is the only change that alters existing gameplay feel. If you dislike it, the alternative is to drop the 8-slot cap entirely and ship just the grid + colour borders.

### 2. Merge in this order

Order matters — it minimises conflict resolution to one rebase.

| # | PR | Branch | Head |
|---|----|--------|------|
| 1 | #142 | `docs/kiro-steering-migration` | `12ece9c` |
| 2 | #144 | `feature/issue-98-save-system` | `25bfcbc` |
| 3 | #149 | `feature/issue-115-menu-scene` | `7ff6297` |
| 4 | #143 | `feature/issue-93-near-miss-feedback` | `a96bc62` |
| 5 | #146 | `feature/issue-94-system-checklist` | `06892c7` |
| 6 | #148 | `feature/issue-99-pause-menu` | `92d0d08` |
| 7 | #145 | `feature/issue-97-objective-banner` | `955d6e0` |
| 8 | #147 | `feature/issue-100-inventory-ui` | `30d21fc` |

**#148 and #149 are stacked PRs** — they target `feature/issue-94-system-checklist` and `feature/issue-98-save-system`, not `main`. GitHub auto-retargets them to `main` once their base merges. That's also why they show no CI checks: security scans only trigger on PRs targeting `main`.

### 3. Expect 3 conflicts, all "keep both"

I rehearsed this exact order locally. Five of eight merge clean. The three that conflict:

- **#143** — `src/scenes/game.js` import block only.
- **#145** — `src/scenes/hud.js`: import block, and the `create()` body (keep the TAB key setup *and* the objective listeners, then combine the two `events.once('shutdown', ...)` handlers into one).
- **#147** — `src/gameobjects/zone_manager.js` + `src/scenes/game.js` + `src/scenes/hud.js`.

⚠️ **The trap that bit me twice.** In the larger `hud.js` and `game.js` conflicts, git factors the trailing `}` of the preceding method out of the conflict region as a shared suffix. If you resolve by deleting the `<<<<<<<` / `=======` / `>>>>>>>` lines, you end up **one brace short** and two method bodies silently weld together. In `game.js` a `/*` comment opener is lost the same way.

This is nasty because **`npm test` still passes** — Vitest never imports Phaser scene files, so a syntactically broken `hud.js` is invisible to all 836 tests. After any resolution inside a class body:

```powershell
npx esbuild src/scenes/hud.js --outfile=$env:TEMP/c.js   # must exit 0
npm run build *> build.log; $LASTEXITCODE                # must be 0
```

### 4. Don't trust the build's output text

`npm run build` prints `✨ Done ✨` **even when it fails**. Only the exit code is truthful. I got this wrong earlier in the session.

### 5. After each merge

Per the (now harmonised) workflow: TODO.md is already updated inside each PR, so after merging just close the issue with the commit link. Open issues awaiting closure: **#93, #94, #97, #98, #99, #100, #115**.

---

## Proof the whole set works together

I merged all eight locally in the order above and ran everything:

- **836 unit tests, 0 failures**
- **0 syntax errors** (every `src/**/*.js` parse-checked with esbuild)
- **`npm run build` exit code 0**
- **Full Playwright suite: 21 passed, 0 failed** (72 skipped stubs)

---

## What each PR contains

| PR | Feature | Tests | Notable |
|----|---------|-------|---------|
| #142 | Kiro migration docs + record 9.1.1 lightning | 442 | Harmonised a TODO.md-timing contradiction across 4 docs |
| #143 | Near-miss feedback (#93) | 487 | Slow-mo, green pulse, XP, SFX, combo feed, SPEC shake |
| #144 | Save system (#98) | 565 | Autosave, searched-container persistence, validation + clamping |
| #145 | Objective banner (#97) | 480 | Cleanest of the batch |
| #146 | TAB checklist (#94) | 481 | Includes a machine-checked loot-table drift guard |
| #147 | Inventory UI (#100) | 502 | 8 slots, stash, discard key, auto-pickup |
| #148 | Pause menu (#99) | 514 | Real timer freeze; E2E went 8 failed → 8 passed |
| #149 | MenuScene (#115) | 560 | CONTINUE resumes correct zone + position |

---

## Bugs found and fixed during two review passes

These were real defects in the first-pass implementations, caught by audit and fixed:

1. **#147 softlock** — 8-slot cap with no way to discard anything. Also the stash and auto-pickup were unreachable dead code, so 2 of 5 acceptance criteria were unmet.
2. **#149 wrong zone** — `ZoneManager` hardcoded `loadZone(0)`, so CONTINUE loaded Zone 0's map then placed the player at another zone's coordinates.
3. **#144 re-loot exploit** — searched-container state wasn't saved, so reloading refilled every container and defeated the 60-minute scarcity design.
4. **#144 unvalidated save input** — `isValidSave` checked key existence but not types/ranges. `inventory: [null]` and `systemsInstalled: 99` both passed validation then crashed.
5. **#148 broken E2E** — all 8 tests timed out; `beforeEach` pressed SPACE once but the transition is a multi-phase cinematic.
6. **#148 E2E flakiness** — passed alone, flaky at 2 workers. Fixed with serial mode, verified 3× at 8/8.
7. **#143 timescale leak** — a run ending mid-slow-motion left `timeScale` at 0.5 for the next run.
8. **#143 wrong slow-mo duration** — `Clock.timeScale` scales the clock that schedules `delayedCall`, so "200ms" actually ran 400ms.
9. **#147 latent crash** — a `keydown-Q` handler was registered pointing at a method that didn't exist.
10. **#143 XP inconsistency** — near-miss XP bypassed the FRENZY multiplier that containers apply.

## One audit claim I disproved — don't "fix" it

Two reviewers flagged `maxParticles: 80` on the new menu rain as a lifetime-total cap that stops rain after 2s, rated HIGH. It's wrong. Phaser's `atLimit()` compares against `getParticleCount()` = alive **+ dead**, i.e. the recycled pool. Measured in a real browser: alive went 30 → 48 over 7s with `emitting: true`. **No bug. Leave it alone.**

---

## Known-good backlog (not blockers, worth issues later)

Pre-existing on `main`, not introduced by these PRs:

- `audio_manager.js` lines 26 and 135 — unwrapped `localStorage` access, throws in private browsing.
- `game.js` — anonymous `zoneChanged` listener leaks one handler per scene restart/quit.
- `hud.js` — blanket `changedata` registry listener fires on every mutation (timer ticks ~3600×/run).
- HUD spec divergences already tracked as #125 and #96 (timer position, Phase 1–2 colour, red-pulse threshold, progress ring).
- Workbench doesn't validate that the two consumed ingredients match the recipe.

New, non-blocking:

- **6 of 7 new E2E files are 100% `test.skip()` stubs** — 72 skipped. Unit coverage is genuinely good (~287 new tests, near-zero tautologies), but end-to-end coverage of the new features is essentially nil. E2E is still absent from CI (issue #29).
- Near-miss is missing nothing else, but the SPEC's `objective banner tap-to-open-checklist` and several §9.2 ordering details remain unimplemented.

---

## Useful commands

```powershell
npm test                                   # 836 when all 8 are merged
npm run build *> build.log; $LASTEXITCODE  # exit code is the only truth
npx playwright test --workers=1            # E2E; use 1 worker
gh pr list --state open
gh pr checks 144
```
