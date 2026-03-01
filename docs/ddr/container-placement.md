# DDR: Container Placement in Zone 0

**Status:** Decided — keep as-is through Phase 2
**Date:** 2026-03-01
**Relevant commit:** b6e2640 (feat: add searchable container functionality with loot system)

---

## Context

After TODO 2.1 shipped (4 hardcoded containers near spawn), the question arose:
should containers respawn, or spread further across Zone 0?

Zone 0 is 3840 × 2880 px. All 4 containers sit within ~260 px of spawn center
(1920, 1440), covering less than 7% of the zone radius. Looted containers stay
open until death/scene restart — there is no respawn timer.

---

## Decision

**Keep as-is.** Phase 3 will introduce proper container placement via a Tiled
object layer, which replaces the hardcoded positions entirely. Adding a respawn
timer or scattering more containers now would create throwaway work.

### Rationale

- Phase 3 tilemap work (TODO 3.1) is the natural home for spatial placement
- Tiled object layers give designers direct control without touching JS
- A respawn timer requires container state serialisation — premature complexity
- The 4-container placeholder is sufficient for testing the loot/inventory loop

---

## Current Behaviour (intentional Phase 2.1 placeholder)

| Property | Value |
|---|---|
| Container count | 4 |
| Placement | Hardcoded offsets from spawn (`addContainers()` in `game.js`) |
| Max distance from spawn | ~260 px |
| Respawn | None — stays open until death or scene restart |
| Loot table | Defined per container in `searchable_container.js` |

---

## Phase 3 Action Items

> Not in scope until Phase 3 tilemap work begins (TODO 3.1).

1. **Load positions from Tiled object layer** in `zone_manager.js`
   - Object type = `"container"`
   - Loot table key pulled from Tiled object property (e.g. `table: "hardware"`)
2. **Remove `addContainers()`** from `game.js` once zone manager handles placement
3. **Target density**: ~15–20 containers for Zone 0 (to be tuned during 3.1)

---

## Files Involved

| File | Role |
|---|---|
| `src/scenes/game.js` | Holds `addContainers()` with 4 hardcoded positions — remove in Phase 3 |
| `src/gameobjects/zone_manager.js` | Phase 3: add Tiled object parsing here |
| `src/gameobjects/searchable_container.js` | Container logic — no changes needed |
