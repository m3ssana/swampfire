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
